import { IOracleAnalyticsRepository } from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { StudentClassRankingView }    from "../../domain/read-models/StudentClassRankingView";
import { StudentClassRankingDTO }     from "../dtos/StudentClassRankingDTO";

// Actor:   Student
// Permission: VIEW_CLASS_RANKING
export class StudentClassRankingQuery {
  constructor(
    private readonly oracleRepo: IOracleAnalyticsRepository,
  ) {}

  // GET /analytics/sections/:sectionId/my-ranking
  // → StudentClassRankingDTO | null
  async execute(
    studentId: string,
    sectionId: string,
  ): Promise<StudentClassRankingDTO | null> {
    const view = await this.oracleRepo.findStudentRanking(studentId, sectionId);
    return view ? this.toDTO(view) : null;
  }

  // private helpers 
  // StudentClassRankingView (domain) → StudentClassRankingDTO (application)
  private toDTO(view: StudentClassRankingView): StudentClassRankingDTO {
    return {
      sectionId:           view.sectionId,
      sectionName:         view.sectionName,
      studentFullname:     view.studentFullname,
      averageScore:        view.averageScore,
      totalAttempts:       view.totalAttempts,
      rankInSection:       view.rankInSection,
      totalRankedStudents: view.totalRankedStudents,
      percentile:          view.percentile,
      sectionAverageScore: view.sectionAverageScore,
      sectionHighestScore: view.sectionHighestScore,
      sectionLowestScore:  view.sectionLowestScore,
      lastUpdatedAt:       view.lastUpdatedAt.toISOString(),
    };
  }
}