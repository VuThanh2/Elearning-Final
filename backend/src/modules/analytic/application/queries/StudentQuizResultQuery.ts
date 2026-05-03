import { IOracleAnalyticsRepository }       from "../../domain/interface-repositories/IOracleAnalyticsRepository";
import { StudentQuizResultView }             from "../../domain/read-models/StudentQuizResultView";
import { StudentQuizResultDTO, AttemptStatus } from "../dtos/StudentQuizResultDTO";
import { IAnalyticCache, AnalyticCacheKey, AnalyticsCacheTTL } from "../../domain/interface-repositories/IAnalyticCache";

// Actor:   Student
// Permission: VIEW_OWN_RESULT
//
// Authorization by data:
//   studentId lấy từ JWT — compound query (studentId, sectionId/quizId)
//   đảm bảo Student chỉ thấy kết quả của mình.
//   Không cần verify enrollment: nếu không có data → [].
export class StudentQuizResultQuery {
  constructor(
    private readonly oracleRepo: IOracleAnalyticsRepository,
    private readonly mongoModel:  any, // StudentQuizAnswerModel
    private readonly cache:      IAnalyticCache,
  ) {}

  // GET /analytics/sections/:sectionId/my-results
  // → StudentQuizResultDTO[]   (sắp xếp SUBMITTED_AT DESC từ Repository)
  async bySection(
    studentId: string,
    sectionId: string,
  ): Promise<StudentQuizResultDTO[]> {
    const key    = AnalyticCacheKey.studentResultsBySection(studentId, sectionId);
    const cached = await this.cache.get<StudentQuizResultDTO[]>(key);
    if (cached) return cached;

    // Try MongoDB first (more reliable than Oracle with projection issues)
    try {
      const mongoData = await this.mongoModel
        .find({ studentId, sectionId })
        .sort({ submittedAt: -1 })
        .lean();

      if (mongoData && mongoData.length > 0) {
        const dtos = mongoData.map((doc: any) => ({
          attemptId:       doc._id,
          quizId:          doc.quizId,
          sectionId:       doc.sectionId,
          quizTitle:       doc.quizTitle || 'Untitled Quiz',
          score:           doc.score || 0,
          maxScore:        doc.maxScore || 100,
          percentage:      (doc.percentage !== undefined) ? doc.percentage : ((doc.score || 0) / (doc.maxScore || 100)),
          startedAt:       doc.startedAt?.toISOString() || new Date().toISOString(),
          submittedAt:     doc.submittedAt?.toISOString() || new Date().toISOString(),
          durationSeconds: doc.durationSeconds || 0,
          attemptNumber:   doc.attemptNumber || 1,
          status:          (doc.status === 'EXPIRED' ? 'EXPIRED' : 'SUBMITTED') as AttemptStatus,
        }));
        await this.cache.set(key, dtos, AnalyticsCacheTTL.NORMAL);
        return dtos;
      }
    } catch (err) {
      console.warn(`[StudentQuizResultQuery] MongoDB query failed for section: ${err}`);
    }

    // Fallback to Oracle
    const views = await this.oracleRepo.findStudentResultsBySection(studentId, sectionId);
    const dtos  = views.map((view) => this.toDTO(view));
    await this.cache.set(key, dtos, AnalyticsCacheTTL.NORMAL);
    return dtos;
  }

  // GET /analytics/quizzes/:quizId/my-results
  // → StudentQuizResultDTO[]   (sắp xếp ATTEMPT_NUMBER ASC từ Repository)
  async byQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizResultDTO[]> {
    const key    = AnalyticCacheKey.studentResultsByQuiz(studentId, quizId);
    const cached = await this.cache.get<StudentQuizResultDTO[]>(key);
    if (cached) return cached;

    // Try MongoDB first
    try {
      const mongoData = await this.mongoModel
        .find({ studentId, quizId })
        .sort({ attemptNumber: 1 })
        .lean();

      if (mongoData && mongoData.length > 0) {
        const dtos = mongoData.map((doc: any) => ({
          attemptId:       doc._id,
          quizId:          doc.quizId,
          sectionId:       doc.sectionId,
          quizTitle:       doc.quizTitle || 'Untitled Quiz',
          score:           doc.score || 0,
          maxScore:        doc.maxScore || 100,
          percentage:      (doc.percentage !== undefined) ? doc.percentage : ((doc.score || 0) / (doc.maxScore || 100)),
          startedAt:       doc.startedAt?.toISOString() || new Date().toISOString(),
          submittedAt:     doc.submittedAt?.toISOString() || new Date().toISOString(),
          durationSeconds: doc.durationSeconds || 0,
          attemptNumber:   doc.attemptNumber || 1,
          status:          (doc.status === 'EXPIRED' ? 'EXPIRED' : 'SUBMITTED') as AttemptStatus,
        }));
        await this.cache.set(key, dtos, AnalyticsCacheTTL.NORMAL);
        return dtos;
      }
    } catch (err) {
      console.warn(`[StudentQuizResultQuery] MongoDB query failed for quiz: ${err}`);
    }

    // Fallback to Oracle
    const views = await this.oracleRepo.findStudentResultsByQuiz(studentId, quizId);
    const dtos  = views.map((view) => this.toDTO(view));
    await this.cache.set(key, dtos, AnalyticsCacheTTL.NORMAL);
    return dtos;
  }

  // private helpers
  // StudentQuizResultView (domain) → StudentQuizResultDTO (application)
  private toDTO(view: StudentQuizResultView): StudentQuizResultDTO {
    return {
      attemptId:       view.attemptId,
      quizId:          view.quizId,
      sectionId:       view.sectionId,
      quizTitle:       view.quizTitle,
      score:           view.score,
      maxScore:        view.maxScore,
      percentage:      view.percentage,
      startedAt:       view.startedAt.toISOString(),
      submittedAt:     view.submittedAt.toISOString(),
      durationSeconds: view.durationSeconds,
      attemptNumber:   view.attemptNumber,
      status:          view.status as AttemptStatus,
    };
  }
}
