import { Request, Response } from "express";
import { CreateQuizUseCase }     from "../../application/use-cases/CreateQuizUseCase";
import { UpdateQuizUseCase }     from "../../application/use-cases/UpdateQuizUseCase";
import { UpdateDeadlineUseCase } from "../../application/use-cases/UpdateDeadlineUseCase";
import { PublishQuizUseCase }    from "../../application/use-cases/PublishQuizUseCase";
import { HideQuizUseCase }       from "../../application/use-cases/HideQuizUseCase";
import { DeleteQuizUseCase }     from "../../application/use-cases/DeleteQuizUseCase";
import { GetQuizUseCase, GetQuizListUseCase } from "../../application/use-cases/GetQuizUseCase";
import { GetQuizForAttemptUseCase } from "../../application/use-cases/GetQuizForAttemptUseCase";
import { CreateQuizDTO }     from "../../application/dtos/CreateQuizDTO";
import { UpdateQuizDTO }     from "../../application/dtos/UpdateQuizDTO";
import { UpdateDeadlineDTO } from "../../application/dtos/UpdateDeadlineDTO";
import { GetPublishedQuizListUseCase } from "../../application/use-cases/GetPublishedQuizListUseCase";

// teacherId luôn lấy từ req.user (JWT payload đã verify bởi middleware).

export class QuizController {
  constructor(
    private readonly createQuizUseCase:     CreateQuizUseCase,
    private readonly updateQuizUseCase:     UpdateQuizUseCase,
    private readonly updateDeadlineUseCase: UpdateDeadlineUseCase,
    private readonly publishQuizUseCase:    PublishQuizUseCase,
    private readonly hideQuizUseCase:       HideQuizUseCase,
    private readonly deleteQuizUseCase:     DeleteQuizUseCase,
    private readonly getQuizUseCase:        GetQuizUseCase,
    private readonly getQuizForAttemptUseCase: GetQuizForAttemptUseCase,
    private readonly getQuizListUseCase:    GetQuizListUseCase,
    private readonly getPublishedQuizListUseCase:   GetPublishedQuizListUseCase,
  ) {}

  // POST /quizzes
  async createQuiz(
    req: Request<{}, {}, CreateQuizDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.createQuizUseCase.execute(
        req.user!.userId,
        req.body
      );
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // PATCH /quizzes/:quizId
  async updateQuiz(
    req: Request<{ quizId: string }, {}, UpdateQuizDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.updateQuizUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // PATCH /quizzes/:quizId/deadline
  async updateDeadline(
    req: Request<{ quizId: string }, {}, UpdateDeadlineDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.updateDeadlineUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // POST /quizzes/:quizId/publish
  async publishQuiz(
    req: Request<{ quizId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.publishQuizUseCase.execute(
        req.user!.userId,
        req.params.quizId
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // POST /quizzes/:quizId/hide
  // Body: { reason?: string } — optional, không có DTO riêng
  async hideQuiz(
    req: Request<{ quizId: string }, {}, { reason?: string }>,
    res: Response
  ): Promise<void> {
    try {
      console.log(`[HideQuiz] Starting hide for quiz: ${req.params.quizId}, user: ${req.user?.userId}`);

      // Validate inputs
      if (!req.user?.userId) {
        console.error('[HideQuiz] No user ID found in request');
        res.status(401).json({ message: "Unauthorized: No user ID" });
        return;
      }

      const result = await this.hideQuizUseCase.execute(
        req.user.userId,
        req.params.quizId,
        req.body.reason
      );
      console.log(`[HideQuiz] Successfully hidden quiz: ${req.params.quizId}`, result);
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      const stack = err instanceof Error ? err.stack : "";
      console.error(`[HideQuiz] Error hiding quiz: ${message}`);
      console.error(`[HideQuiz] Stack: ${stack}`);
      console.error(`[HideQuiz] Full error:`, err);
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // DELETE /quizzes/:quizId
  async deleteQuiz(
    req: Request<{ quizId: string }>,
    res: Response
  ): Promise<void> {
    try {
      await this.deleteQuizUseCase.execute(
        req.user!.userId,
        req.params.quizId
      );
      res.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /quizzes/:quizId
  async getQuiz(
    req: Request<{ quizId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.getQuizUseCase.execute(
        req.user!.userId,
        req.params.quizId
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /quizzes/:quizId/attempt (Student view during attempt)
  async getQuizForAttempt(
    req: Request<{ quizId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.getQuizForAttemptUseCase.execute(
        req.params.quizId
      );
      res.status(200).json({
        data: {
          quiz: result,
          ...result,
        },
        quiz: result,
        ...result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /sections/:sectionId/quizzes
  async getQuizList(
    req: Request<{ sectionId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.getQuizListUseCase.execute(
        req.user!.userId,
        req.params.sectionId
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // GET /sections/:sectionId/quizzes/published
  //
  // Actor: Student (và Teacher nếu muốn preview danh sách bài đã published)
  async getPublishedQuizList(
    req: Request<{ sectionId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.getPublishedQuizListUseCase.execute(
        req.params.sectionId,
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// map error prefix của Quiz Context → HTTP status
//
// Convention error prefix trong Quiz Context:
//   ValidationError:   → 400  input không đúng format
//   NotFoundError:     → 404  resource không tồn tại
//   AccessDeniedError: → 403  không có quyền
//   DomainError:       → 422  vi phạm business rule (Unprocessable Entity)
//   (other)            → 500
//
// Tại sao 422 cho DomainError:
//   400 = format sai (validator bắt trước đó rồi)
//   422 = format đúng nhưng không xử lý được theo business rule
//   (publish quiz Expired, rút ngắn deadline...)
function mapErrorToStatus(message: string): number {
  if (message.startsWith("ValidationError:"))   return 400;
  if (message.startsWith("NotFoundError:"))     return 404;
  if (message.startsWith("AccessDeniedError:")) return 403;
  if (message.startsWith("DomainError:"))       return 422;
  if (message.startsWith("InfrastructureError:")) return 503;
  return 500;
}