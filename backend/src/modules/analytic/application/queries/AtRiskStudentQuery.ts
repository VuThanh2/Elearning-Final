import { IOracleAnalyticsRepository }                     from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { IAcademicQueryService }                          from "../../../academic";
import { AtRiskStudentView }                              from "../../domain/read-models/AtRiskStudentView";
import { AtRiskStudentDTO, AtRiskSectionReportDTO, RiskLevel } from "../dtos/AtRiskStudentDTO";

// Actor:   Teacher
// Permission: VIEW_AT_RISK_STUDENTS
export class AtRiskStudentQuery {
  constructor(
    private readonly oracleRepo:      IOracleAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
  ) {}

  // GET /analytics/sections/:sectionId/at-risk
  // → AtRiskSectionReportDTO
  async bySection(
    teacherId: string,
    sectionId: string,
  ): Promise<AtRiskSectionReportDTO> {
    const ok = await this.academicService.isTeacherAssignedToSection(teacherId, sectionId);
    if (!ok) throw new Error(
      `AccessDeniedError: Teacher không được phép xem at-risk report của section "${sectionId}".`,
    );

    const views = await this.oracleRepo.findAtRiskStudentsBySection(sectionId);
    const students = views.map((view) => this.toDTO(view));

    return {
      sectionId,
      sectionName:    views[0]?.sectionName ?? sectionId,
      totalStudents:  students.length,
      rankedStudents: students.length,
      students,
    };
  }

  // private helpers
  // AtRiskStudentView (domain) → AtRiskStudentDTO (application)
  private toDTO(view: AtRiskStudentView): AtRiskStudentDTO {
    return {
      studentId:              view.studentId,
      studentFullname:        view.studentFullname,
      totalQuizzes:           view.totalQuizzes,
      attemptedQuizzes:       view.attemptedQuizzes,
      quizParticipationRate:  view.quizParticipationRate,
      averageScore:           view.averageScore,
      lowestScore:            view.lowestScore,
      participationRiskLevel: view.participationRiskLevel as RiskLevel,
      averageScoreRiskLevel:  view.averageScoreRiskLevel  as RiskLevel,
    };
  }
}