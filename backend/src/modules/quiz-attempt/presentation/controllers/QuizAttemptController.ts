import { Request, Response }       from "express";
import { StartQuizAttemptUseCase }     from "../../application/use-cases/StartQuizAttemptUseCase";
import { SubmitQuizAttemptUseCase }    from "../../application/use-cases/SubmitQuizAttemptUseCase";
import { ExpireQuizAttemptUseCase }    from "../../application/use-cases/ExpireQuizAttemptUseCase";
import { SubmitAttemptDTO }        from "../../application/dtos/SubmitAttemptDTO";
import { ExpireAttemptDTO }        from "../../application/dtos/ExpireAttemptDTO";

// Trách nhiệm duy nhất: nhận HTTP request → gọi use case → trả response.
// Không có business logic ở đây.
//
// studentId luôn lấy từ req.user (JWT payload đã verify bởi middleware) —
// không bao giờ nhận từ body/param để tránh impersonation.
//
// Routes được bảo vệ bởi:
//   authenticate          — requireAuthentication (verify JWT)
//   authorizeAttemptQuiz  — requireRole(ATTEMPT_QUIZ)
//   authorizeViewResult   — requireRole(VIEW_OWN_RESULT)
//
// Lưu ý: cả Student và Teacher đều có ATTEMPT_QUIZ và VIEW_OWN_RESULT
// không cần tách authorizeStudent riêng.

export class QuizAttemptController {
  constructor(
    private readonly startAttemptUseCase:  StartQuizAttemptUseCase,
    private readonly submitAttemptUseCase: SubmitQuizAttemptUseCase,
    private readonly expireAttemptUseCase: ExpireQuizAttemptUseCase,
  ) {}

  // POST /quizzes/:quizId/attempts
  //
  // Student bắt đầu làm quiz.
  // quizId lấy từ URL param — không có request body.
  // Response 201: StartAttemptResponseDTO (attemptId, expiresAt, questions[])
  async startAttempt(
    req: Request<{ quizId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.startAttemptUseCase.execute(
        req.user!.userId,
        req.params.quizId,
      );
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // POST /attempts/:attemptId/submit
  //
  // Student nộp bài chủ động.
  // Body: SubmitAttemptDTO { answers: AnswerItemDTO[] }
  // Response 200: FinalizeAttemptResponseDTO (score, percentage, answers[])
  async submitAttempt(
    req: Request<{ attemptId: string }, {}, SubmitAttemptDTO>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.submitAttemptUseCase.execute(
        req.user!.userId,
        req.params.attemptId,
        req.body,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // POST /attempts/:attemptId/expire
  //
  // Frontend auto-submit khi detect hết giờ.
  // Body: ExpireAttemptDTO { answers: AnswerItemDTO[] } — có thể rỗng []
  // Response 200: FinalizeAttemptResponseDTO
  //
  // Idempotent: nếu attempt đã Expired (retry), trả về 200 bình thường.
  async expireAttempt(
    req: Request<{ attemptId: string }, {}, ExpireAttemptDTO>,
    res: Response,
  ): Promise<void> {
    try {
      const result = await this.expireAttemptUseCase.execute(
        req.user!.userId,
        req.params.attemptId,
        req.body,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// mapErrorToStatus 
//
// ValidationError:        400 — input không đúng format (validator bắt)
// NotFoundError:          404 — attempt/quiz không tồn tại
// NotEnrolledError:       403 — student không thuộc section
// AccessDeniedError:      403 — attempt không thuộc student này
// QuizClosedError:        409 — quiz không Published hoặc đã quá deadline
//                               (409 Conflict: trạng thái hiện tại của resource
//                               không cho phép hành động này)
// MaxAttemptsReachedError: 409 — đã hết số lần làm
// DomainError:            422 — vi phạm business rule (hết giờ khi submit...)
// InternalError:          500 — lỗi data inconsistency nội bộ

function mapErrorToStatus(message: string): number {
  if (message.startsWith("ValidationError:"))        return 400;
  if (message.startsWith("NotFoundError:"))          return 404;
  if (message.startsWith("NotEnrolledError:"))       return 403;
  if (message.startsWith("AccessDeniedError:"))      return 403;
  if (message.startsWith("QuizClosedError:"))        return 409;
  if (message.startsWith("MaxAttemptsReachedError:")) return 409;
  if (message.startsWith("DomainError:"))            return 422;
  if (message.startsWith("InternalError:"))          return 500;
  return 500;
}