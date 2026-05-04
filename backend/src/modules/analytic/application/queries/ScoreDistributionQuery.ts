import { IOracleAnalyticsRepository }                from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { IAcademicQueryService }                     from "../../../academic";
import { ScoreDistributionView, ScoreRangeBucket }   from "../../domain/read-models/ScoreDistributionView";
import { ScoreDistributionDTO, ScoreRangeBucketDTO } from "../dtos/ScoreDistributionDTO";
import { IAnalyticCache, AnalyticCacheKey, AnalyticsCacheTTL } from "../../domain/interface-repositories/IAnalyticCache";

// Actor:   Teacher | Admin
// Permission: VIEW_ANALYTICS
export class ScoreDistributionQuery {
  constructor(
    private readonly oracleRepo:      IOracleAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
    private readonly mongoModel:      any, // StudentQuizAnswerModel
    private readonly cache:      IAnalyticCache,
  ) {}

  // GET /analytics/sections/:sectionId/quizzes/:quizId/score-distribution
  // → ScoreDistributionDTO | null
  async execute(
    actorId:   string,
    actorRole: "TEACHER" | "ADMIN",
    quizId:    string,
    sectionId: string,
  ): Promise<ScoreDistributionDTO | null> {
    if (actorRole === "TEACHER") {
      const ok = await this.academicService.isTeacherAssignedToSection(actorId, sectionId);
      if (!ok) throw new Error(
        `AccessDeniedError: Teacher không được phép xem score distribution của section "${sectionId}".`,
      );
    }

    const key    = AnalyticCacheKey.scoreDistribution(quizId, sectionId);
    const cached = await this.cache.get<ScoreDistributionDTO>(key);
    if (cached) return cached;

    try {
      const view = await this.oracleRepo.findScoreDistribution(quizId, sectionId);
      const dto  = view ? this.toDTO(view) : null;
      if (dto && this.hasCompleteBuckets(dto)) {
        await this.cache.set(key, dto, AnalyticsCacheTTL.HEAVY);
        return dto;
      }
    } catch (err) {
      throw err;
    }

    try {
      const view = await this.oracleRepo.findScoreDistributionFromResults(quizId, sectionId);
      const dto = view ? this.toDTO(view) : null;
      if (dto && this.hasCompleteBuckets(dto)) {
        await this.cache.set(key, dto, AnalyticsCacheTTL.NORMAL);
        return dto;
      }
    } catch (err) {
      // Direct Oracle fallback is best-effort; legacy Mongo fallback below can
      // still satisfy old data and tests if this projection path is unavailable.
    }

    try {
      // Fallback only for legacy data before the Oracle projection is populated.
      const mongoData = await this.mongoModel
        .find({ quizId, sectionId })
        .lean()
        .exec();

      if (mongoData && mongoData.length > 0) {
        // Get max score from first document
        const maxScore = mongoData[0].maxScore || 100;

        const bestByStudent = new Map<string, any>();
        for (const attempt of mongoData) {
          const existing = bestByStudent.get(attempt.studentId);
          if (!existing || (attempt.score || 0) > (existing.score || 0)) {
            bestByStudent.set(attempt.studentId, attempt);
          }
        }
        const rankedAttempts = Array.from(bestByStudent.values());

        // Create score buckets (0-20%, 20-40%, etc.)
        const buckets: ScoreRangeBucketDTO[] = [];
        const bucketRanges = [
          { label: '0-20%', pctStart: 0, pctEnd: 0.2 },
          { label: '20-40%', pctStart: 0.2, pctEnd: 0.4 },
          { label: '40-60%', pctStart: 0.4, pctEnd: 0.6 },
          { label: '60-80%', pctStart: 0.6, pctEnd: 0.8 },
          { label: '80-100%', pctStart: 0.8, pctEnd: 1.0 },
        ];

        for (const range of bucketRanges) {
          let count = 0;
          for (const attempt of rankedAttempts) {
            const score = attempt.score || 0;
            const percentage = score / maxScore;
            const inUpperBucket = range.pctEnd === 1.0 && percentage === range.pctEnd;
            if (percentage >= range.pctStart && (percentage < range.pctEnd || inUpperBucket)) {
              count += 1;
            }
          }

          buckets.push({
            label: range.label,
            rangeStartPct: range.pctStart,
            rangeEndPct: range.pctEnd,
            rangeStart: Math.round(range.pctStart * maxScore),
            rangeEnd: Math.round(range.pctEnd * maxScore),
            isUpperBoundInclusive: range.pctEnd === 1.0,
            studentCount: count,
            percentage: rankedAttempts.length > 0 ? count / rankedAttempts.length : 0,
          });
        }

        const dto: ScoreDistributionDTO = {
          quizId,
          sectionId,
          quizTitle: mongoData[0].quizTitle || 'Untitled Quiz',
          sectionName: sectionId,
          maxScore,
          totalRankedStudents: rankedAttempts.length,
          lastUpdatedAt: new Date().toISOString(),
          scoreRanges: buckets,
        };

        await this.cache.set(key, dto, AnalyticsCacheTTL.HEAVY);
        return dto;
      }
    } catch (err) {
      // Legacy fallback is best-effort only.
    }

    return null;
  }

  // private helpers
  // ScoreDistributionView (domain) → ScoreDistributionDTO (application)
  private toDTO(view: ScoreDistributionView): ScoreDistributionDTO {
    return {
      quizId:              view.quizId,
      sectionId:           view.sectionId,
      quizTitle:           view.quizTitle,
      sectionName:         view.sectionName,
      maxScore:            view.maxScore,
      totalRankedStudents: view.totalRankedStudents,
      lastUpdatedAt:       view.lastUpdatedAt.toISOString(),
      scoreRanges:         view.scoreRanges.map((b) => this.toBucketDTO(b)),
    };
  }

  private hasCompleteBuckets(dto: ScoreDistributionDTO): boolean {
    if (dto.totalRankedStudents <= 0) return true;
    if (dto.scoreRanges.length === 0) return false;

    const bucketedStudents = dto.scoreRanges.reduce(
      (sum, bucket) => sum + bucket.studentCount,
      0,
    );

    return bucketedStudents === dto.totalRankedStudents;
  }

  private toBucketDTO(bucket: ScoreRangeBucket): ScoreRangeBucketDTO {
    return {
      label:                 bucket.label,
      rangeStartPct:         bucket.rangeStartPct,
      rangeEndPct:           bucket.rangeEndPct,
      rangeStart:            bucket.rangeStart,
      rangeEnd:              bucket.rangeEnd,
      isUpperBoundInclusive: bucket.isUpperBoundInclusive,
      studentCount:          bucket.studentCount,
      percentage:            bucket.percentage,
    };
  }
}
