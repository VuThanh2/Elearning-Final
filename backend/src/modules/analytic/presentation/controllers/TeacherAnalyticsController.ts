import { Request, Response } from "express";
import { QuizPerformanceQuery }    from "../../application/queries/QuizPerformanceQuery";
import { AtRiskStudentQuery }     from "../../application/queries/AtRiskStudentQuery";
import { ScoreDistributionQuery }  from "../../application/queries/ScoreDistributionQuery";
import { QuestionFailureRateQuery } from "../../application/queries/QuestionFailureRateQuery";

// Actor: Teacher
// Permissions used:
//   VIEW_ANALYTICS       — quiz performance, score distribution, question failure rate
//   VIEW_AT_RISK_STUDENTS — at-risk dashboard
//
// Tách riêng khỏi Student và Admin vì:
//   - Permissions khác nhau hoàn toàn
//   - Subject domain khác (section analytics vs personal results)
//   - Authorization by data: Teacher chỉ xem section mình dạy
//     → isTeacherAssignedToSection() được gọi trong mỗi Query
//
// teacherId luôn lấy từ req.user.userId (JWT payload) —
// không bao giờ nhận từ body/param để tránh impersonation.
export class TeacherAnalyticsController {
  constructor(
    private readonly quizPerformanceQuery:     QuizPerformanceQuery,
    private readonly atRiskStudentQuery:       AtRiskStudentQuery,
    private readonly scoreDistributionQuery:   ScoreDistributionQuery,
    private readonly questionFailureRateQuery: QuestionFailureRateQuery,
  ) {}

  // GET /analytics/sections/:sectionId/quizzes/:quizId/performance
  // Permission: VIEW_ANALYTICS
  // Response 200: QuizPerformanceDTO | null
  // null = chưa có attempt submitted nào cho quiz này.
  async getQuizPerformance(
    req: Request<{ sectionId: string; quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.quizPerformanceQuery.byQuiz(
        req.user!.userId,
        req.params.quizId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/sections/:sectionId/performance
  // Permission: VIEW_ANALYTICS
  // Response 200: QuizPerformanceDTO[]
  // [] = section chưa có quiz nào được attempt.
  async getSectionPerformance(
    req: Request<{ sectionId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.quizPerformanceQuery.bySection(
        req.user!.userId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/sections/:sectionId/at-risk
  // Permission: VIEW_AT_RISK_STUDENTS
  // Response 200: AtRiskSectionReportDTO
  async getAtRiskStudents(
    req: Request<{ sectionId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.atRiskStudentQuery.bySection(
        req.user!.userId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/sections/:sectionId/quizzes/:quizId/score-distribution
  // Permission: VIEW_ANALYTICS
  // Response 200: ScoreDistributionDTO | null
  // null = chưa có attempt submitted nào.
  // actorRole đọc từ req.user.roleName (đã có trong JWT payload sau authenticate):
  //   "Teacher" → ScoreDistributionQuery verify isTeacherAssignedToSection
  //   "Admin"   → ScoreDistributionQuery bỏ qua verify
  async getScoreDistribution(
    req: Request<{ sectionId: string; quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const roleName = req.user!.roleName;
      const actorRole = roleName === "Admin" ? "ADMIN" : "TEACHER";
 
      const result = await this.scoreDistributionQuery.execute(
        req.user!.userId,
        actorRole,
        req.params.quizId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /analytics/sections/:sectionId/quizzes/:quizId/question-failure-rate
  // Permission: VIEW_ANALYTICS
  // Response 200: QuestionFailureRateDTO | null
  // null = chưa có attempt submitted nào trong scope này.
  async getQuestionFailureRate(
    req: Request<{ sectionId: string; quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.questionFailureRateQuery.execute(
        req.user!.userId,
        req.params.quizId,
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// mapErrorToStatus — Analytics Context error convention
//
// AccessDeniedError: 403 — Teacher không được assign vào section
// NotFoundError:     404 — resource không tồn tại
// (other)            500
function mapErrorToStatus(message: string): number {
  if (message.startsWith("AccessDeniedError:")) return 403;
  if (message.startsWith("NotFoundError:"))     return 404;
  return 500;
}