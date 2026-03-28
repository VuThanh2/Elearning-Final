import { IOracleAnalyticsRepository } from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { IAcademicQueryService }      from "../../../academic";
import { IAnalyticCache, AnalyticCacheKey, AnalyticsCacheTTL } from "../../domain/interface-repositories/IAnalyticCache";
import { QuizPerformanceView }        from "../../domain/read-models/QuizPerformanceView";
import { QuizPerformanceDTO }         from "../dtos/QuizPerformanceDTO";

// Actor:   Teacher
// Permission: VIEW_ANALYTICS
//
// Authorization by data áp dụng cho cả 2 method:
//   Teacher chỉ được xem analytics của section mình dạy.
//   Business Rule: "Teacher Can Only Manage Sections They Are Assigned To"
export class QuizPerformanceQuery {
  constructor(
    private readonly oracleRepo:      IOracleAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
    private readonly cache:           IAnalyticCache, 
  ) {}

  // GET /analytics/sections/:sectionId/quizzes/:quizId/performance
  // → QuizPerformanceDTO | null
  // null = chưa có attempt nào submitted cho quiz này.
  async byQuiz(
    teacherId: string,
    quizId:    string,
    sectionId: string,
  ): Promise<QuizPerformanceDTO | null> {
    await this.assertTeacherAssigned(teacherId, sectionId);
 
    const key    = AnalyticCacheKey.quizPerformance(quizId, sectionId);
    const cached = await this.cache.get<QuizPerformanceDTO>(key);
    if (cached) return cached;
 
    const view = await this.oracleRepo.findQuizPerformance(quizId, sectionId);
    const dto  = view ? this.toDTO(view) : null;
    if (dto) await this.cache.set(key, dto, AnalyticsCacheTTL.NORMAL);
    return dto;
  }

  // GET /analytics/sections/:sectionId/performance
  // → QuizPerformanceDTO[]
  // [] = section chưa có quiz nào được attempt.
  async bySection(
    teacherId: string,
    sectionId: string,
  ): Promise<QuizPerformanceDTO[]> {
    await this.assertTeacherAssigned(teacherId, sectionId);
 
    const key    = AnalyticCacheKey.sectionPerformance(sectionId);
    const cached = await this.cache.get<QuizPerformanceDTO[]>(key);
    if (cached) return cached;
 
    const views = await this.oracleRepo.findQuizPerformanceBySection(sectionId);
    const dtos  = views.map((view) => this.toDTO(view));
    await this.cache.set(key, dtos, AnalyticsCacheTTL.NORMAL);
    return dtos;
  }

  // private helpers 
  private async assertTeacherAssigned(teacherId: string, sectionId: string): Promise<void> {
    const ok = await this.academicService.isTeacherAssignedToSection(teacherId, sectionId);
    if (!ok) throw new Error(
      `AccessDeniedError: Teacher không được phép xem analytics của section "${sectionId}".`,
    );
  }
 
  // QuizPerformanceView (domain) → QuizPerformanceDTO (application)
  private toDTO(view: QuizPerformanceView): QuizPerformanceDTO {
    return {
      quizId:            view.quizId,
      sectionId:         view.sectionId,
      quizTitle:         view.quizTitle,
      sectionName:       view.sectionName,
      totalAttempts:     view.totalAttempts,
      attemptedStudents: view.attemptedStudents,
      totalStudents:     view.totalStudents,
      averageScore:      view.averageScore,
      highestScore:      view.highestScore,
      lowestScore:       view.lowestScore,
      completionRate:    view.completionRate,
      lastUpdatedAt:     view.lastUpdatedAt.toISOString(),
    };
  }
}