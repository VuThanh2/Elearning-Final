import { IOracleAnalyticsRepository } from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { IAcademicQueryService } from "../../../academic";
import { AtRiskStudentView } from "../../domain/read-models/AtRiskStudentView";
import { AtRiskStudentDTO, AtRiskSectionReportDTO, RiskLevel } from "../dtos/AtRiskStudentDTO";
import { IAnalyticCache, AnalyticCacheKey, AnalyticsCacheTTL } from "../../domain/interface-repositories/IAnalyticCache";

export class AtRiskStudentQuery {
  constructor(
    private readonly oracleRepo: IOracleAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
    private readonly mongoModel: any,
    private readonly cache: IAnalyticCache,
  ) {}

  async bySection(
    teacherId: string,
    sectionId: string,
  ): Promise<AtRiskSectionReportDTO> {
    const ok = await this.academicService.isTeacherAssignedToSection(teacherId, sectionId);
    if (!ok) throw new Error(
      `AccessDeniedError: Teacher khong duoc phep xem at-risk report cua section "${sectionId}".`,
    );

    const key = AnalyticCacheKey.atRiskStudents(sectionId);
    const cached = await this.cache.get<AtRiskSectionReportDTO>(key);
    if (cached) return cached;

    const views = await this.oracleRepo.findAtRiskStudentsBySection(sectionId);
    if (views.length > 0) {
      const students = views.map((view) => this.toDTO(view));
      const dto: AtRiskSectionReportDTO = {
        sectionId,
        sectionName: views[0]?.sectionName ?? sectionId,
        totalStudents: students.length,
        rankedStudents: students.filter((student) => student.attemptedQuizzes > 0).length,
        students,
      };
      await this.cache.set(key, dto, AnalyticsCacheTTL.HEAVY);
      return dto;
    }

    const fallback = await this.fromMongoFallback(sectionId);
    await this.cache.set(key, fallback, AnalyticsCacheTTL.HEAVY);
    return fallback;
  }

  private async fromMongoFallback(sectionId: string): Promise<AtRiskSectionReportDTO> {
    try {
      const mongoData = await this.mongoModel
        .find({ sectionId })
        .lean()
        .exec();

      if (!mongoData || mongoData.length === 0) {
        return {
          sectionId,
          sectionName: sectionId,
          totalStudents: 0,
          rankedStudents: 0,
          students: [],
        };
      }

      const studentMap = new Map<string, { studentId: string; scores: number[]; attemptCount: number }>();
      for (const attempt of mongoData) {
        const studentId = String(attempt.studentId ?? "");
        if (!studentId) continue;
        const student = studentMap.get(studentId) ?? { studentId, scores: [], attemptCount: 0 };
        student.scores.push(Number(attempt.score ?? 0));
        student.attemptCount += 1;
        studentMap.set(studentId, student);
      }

      const students: AtRiskStudentDTO[] = [...studentMap.values()].map((student) => {
        const averageScore = student.scores.length > 0
          ? student.scores.reduce((sum, score) => sum + score, 0) / student.scores.length
          : 0;
        const lowestScore = student.scores.length > 0 ? Math.min(...student.scores) : 0;
        const averageScoreRiskLevel: RiskLevel =
          averageScore < 50 ? "HIGH" : averageScore < 70 ? "MEDIUM" : "LOW";

        return {
          studentId: student.studentId,
          studentFullname: `Student ${student.studentId}`,
          totalQuizzes: student.attemptCount,
          attemptedQuizzes: student.attemptCount,
          quizParticipationRate: student.attemptCount > 0 ? 1 : 0,
          averageScore: Math.round(averageScore * 100) / 100,
          lowestScore,
          participationRiskLevel: "LOW",
          averageScoreRiskLevel,
        };
      });

      return {
        sectionId,
        sectionName: sectionId,
        totalStudents: students.length,
        rankedStudents: students.length,
        students,
      };
    } catch {
      return {
        sectionId,
        sectionName: sectionId,
        totalStudents: 0,
        rankedStudents: 0,
        students: [],
      };
    }
  }

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
      averageScoreRiskLevel:  view.averageScoreRiskLevel as RiskLevel,
    };
  }
}
