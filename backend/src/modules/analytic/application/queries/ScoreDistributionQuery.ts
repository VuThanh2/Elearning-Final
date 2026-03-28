import { IOracleAnalyticsRepository }                from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { IAcademicQueryService }                     from "../../../academic";
import { ScoreDistributionView, ScoreRangeBucket }   from "../../domain/read-models/ScoreDistributionView";
import { ScoreDistributionDTO, ScoreRangeBucketDTO } from "../dtos/ScoreDistributionDTO";

// Actor:   Teacher | Admin
// Permission: VIEW_ANALYTICS
export class ScoreDistributionQuery {
  constructor(
    private readonly oracleRepo:      IOracleAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
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

    const view = await this.oracleRepo.findScoreDistribution(quizId, sectionId);
    return view ? this.toDTO(view) : null;
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