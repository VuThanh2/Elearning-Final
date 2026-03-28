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
 
    const view = await this.oracleRepo.findScoreDistribution(quizId, sectionId);
    const dto  = view ? this.toDTO(view) : null;
    if (dto) await this.cache.set(key, dto, AnalyticsCacheTTL.HEAVY);
    return dto;
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