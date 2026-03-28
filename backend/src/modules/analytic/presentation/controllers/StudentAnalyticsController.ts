import { Request, Response } from "express";
import { StudentQuizResultQuery }  from "../../application/queries/StudentQuizResultQuery";
import { StudentQuizAnswerQuery }       from "../../application/queries/StudentQuizAnswerQuery";
import { StudentClassRankingQuery } from "../../application/queries/StudentClassRankingQuery";

// Actor: Student
// Permissions used:
//   VIEW_OWN_RESULT    — quiz results, answer review
//   VIEW_CLASS_RANKING — ranking trong section
//
// Authorization by data:
//   studentId luôn từ JWT — Student chỉ thấy data của chính mình.
//   Không cần verify enrollment vì query đã filter theo studentId:
//   nếu student không thuộc section → query trả về [] hoặc null.
export class StudentAnalyticsController {
  constructor(
    private readonly getStudentQuizResultQuery:   StudentQuizResultQuery,
    private readonly getStudentQuizAnswerQuery:   StudentQuizAnswerQuery,
    private readonly getStudentClassRankingQuery: StudentClassRankingQuery,
  ) {}

  // GET /analytics/sections/:sectionId/my-results
  // Permission: VIEW_OWN_RESULT
  // Response 200: StudentQuizResultDTO[]   (SUBMITTED_AT DESC)
  // [] = student chưa attempt quiz nào trong section này.
  async getResultsBySection(
    req: Request<{ sectionId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getStudentQuizResultQuery.bySection(
        req.user!.userId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/quizzes/:quizId/my-results
  // Permission: VIEW_OWN_RESULT
  // Response 200: StudentQuizResultDTO[]   (ATTEMPT_NUMBER ASC)
  // [] = student chưa attempt quiz này.
  async getResultsByQuiz(
    req: Request<{ quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getStudentQuizResultQuery.byQuiz(
        req.user!.userId,
        req.params.quizId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/attempts/:attemptId/answer-review
  // Permission: VIEW_OWN_RESULT
  // Response 200: StudentQuizAnswerReviewDTO | null
  // null = projection chưa populate (eventually consistent — thử lại sau).
  async getAnswerReview(
    req: Request<{ attemptId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getStudentQuizAnswerQuery.byAttempt(
        req.user!.userId,
        req.params.attemptId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/quizzes/:quizId/my-answer-history
  // Permission: VIEW_OWN_RESULT
  // Response 200: StudentQuizAnswerReviewDTO[]  (ATTEMPT_NUMBER ASC)
  // [] = student chưa attempt quiz này, hoặc projection chưa được populate.
  async getAnswerHistoryByQuiz(
    req: Request<{ quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getStudentQuizAnswerQuery.byQuiz(
        req.user!.userId,
        req.params.quizId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/sections/:sectionId/my-ranking
  // Permission: VIEW_CLASS_RANKING
  // Response 200: StudentClassRankingDTO | null
  // null = student chưa attempt quiz nào trong section (chưa được xếp hạng).
  async getMyRanking(
    req: Request<{ sectionId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.getStudentClassRankingQuery.execute(
        req.user!.userId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// mapErrorToStatus — Analytics Context (Student)
//
// AccessDeniedError: 403 — ownership check thất bại (xem attempt của người khác)
// (other)            500
function mapErrorToStatus(message: string): number {
  if (message.startsWith("AccessDeniedError:")) return 403;
  return 500;
}