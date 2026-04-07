import { IOracleAnalyticsRepository }                     from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { IAcademicQueryService }                          from "../../../academic";
import { AtRiskStudentView }                              from "../../domain/read-models/AtRiskStudentView";
import { AtRiskStudentDTO, AtRiskSectionReportDTO, RiskLevel } from "../dtos/AtRiskStudentDTO";
import { IAnalyticCache, AnalyticCacheKey, AnalyticsCacheTTL } from "../../domain/interface-repositories/IAnalyticCache";

// Actor:   Teacher
// Permission: VIEW_AT_RISK_STUDENTS
export class AtRiskStudentQuery {
  constructor(
    private readonly oracleRepo:      IOracleAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
    private readonly mongoModel:      any, // StudentQuizAnswerModel
    private readonly cache:      IAnalyticCache,
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

    const key    = AnalyticCacheKey.atRiskStudents(sectionId);
    const cached = await this.cache.get<AtRiskSectionReportDTO>(key);
    if (cached) return cached;

    // Try MongoDB first (aggregates attempt data)
    try {
      const mongoData = await this.mongoModel
        .find({ sectionId })
        .lean()
        .exec();

      if (mongoData && mongoData.length > 0) {
        // Group by studentId and calculate metrics
        const studentMap = new Map<string, any>();

        for (const attempt of mongoData) {
          if (!studentMap.has(attempt.studentId)) {
            studentMap.set(attempt.studentId, {
              studentId: attempt.studentId,
              scores: [],
              attemptCount: 0,
            });
          }

          const student = studentMap.get(attempt.studentId)!;
          student.scores.push(attempt.score || 0);
          student.attemptCount += 1;
        }

        // Convert to DTOs
        const students: AtRiskStudentDTO[] = Array.from(studentMap.values()).map((student: any) => {
          const attemptedQuizzes = student.attemptCount;
          const totalQuizzes = attemptedQuizzes; // estimate from MongoDB
          const participationRate = totalQuizzes > 0 ? attemptedQuizzes / totalQuizzes : 0;
          const averageScore = student.scores.length > 0
            ? student.scores.reduce((sum: number, s: number) => sum + s, 0) / student.scores.length
            : 0;
          const lowestScore = student.scores.length > 0
            ? Math.min(...student.scores)
            : 0;

          // Simple risk level calculation
          let participationRiskLevel: RiskLevel = 'LOW';
          if (participationRate < 0.3) participationRiskLevel = 'HIGH';
          else if (participationRate < 0.6) participationRiskLevel = 'MEDIUM';

          let averageScoreRiskLevel: RiskLevel = 'LOW';
          if (averageScore < 50) averageScoreRiskLevel = 'HIGH';
          else if (averageScore < 70) averageScoreRiskLevel = 'MEDIUM';

          return {
            studentId: student.studentId,
            studentFullname: `Student ${student.studentId}`,
            totalQuizzes,
            attemptedQuizzes,
            quizParticipationRate: participationRate,
            averageScore: Math.round(averageScore * 100) / 100,
            lowestScore,
            participationRiskLevel,
            averageScoreRiskLevel,
          };
        });

        const dto: AtRiskSectionReportDTO = {
          sectionId,
          sectionName: sectionId,
          totalStudents: students.length,
          rankedStudents: students.length,
          students: students.sort((a, b) =>
            (b.participationRiskLevel === 'HIGH' ? 1 : 0) - (a.participationRiskLevel === 'HIGH' ? 1 : 0)
          ),
        };

        await this.cache.set(key, dto, AnalyticsCacheTTL.HEAVY);
        return dto;
      }
    } catch (err) {
      // Silently fall back to Oracle if MongoDB fails
    }

    try {
      const views    = await this.oracleRepo.findAtRiskStudentsBySection(sectionId);
      const students = views.map((view) => this.toDTO(view));

      // Giữ nguyên hoàn toàn cách build response từ file gốc
      const dto: AtRiskSectionReportDTO = {
        sectionId,
        sectionName:    views[0]?.sectionName ?? sectionId,
        totalStudents:  students.length,
        rankedStudents: students.length,
        students,
      };

      await this.cache.set(key, dto, AnalyticsCacheTTL.HEAVY);
      return dto;
    } catch (err) {
      throw err;
    }
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