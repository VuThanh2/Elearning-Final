import { Request, Response } from "express";
import { CreateQuizUseCase }     from "../../application/use-cases/CreateQuizUseCase";
import { UpdateQuizUseCase }     from "../../application/use-cases/UpdateQuizUseCase";
import { UpdateDeadlineUseCase } from "../../application/use-cases/UpdateDeadlineUseCase";
import { PublishQuizUseCase }    from "../../application/use-cases/PublishQuizUseCase";
import { HideQuizUseCase }       from "../../application/use-cases/HideQuizUseCase";
import { GetQuizUseCase, GetQuizListUseCase } from "../../application/use-cases/QuizQueryUseCase";
import { CreateQuizDTO }     from "../../application/dtos/CreateQuizDTO";
import { UpdateQuizDTO }     from "../../application/dtos/UpdateQuizDTO";
import { UpdateDeadlineDTO } from "../../application/dtos/UpdateDeadlineDTO";

// teacherId luôn lấy từ req.user (JWT payload đã verify bởi middleware).

export class QuizController {
  constructor(
    private readonly createQuizUseCase:     CreateQuizUseCase,
    private readonly updateQuizUseCase:     UpdateQuizUseCase,
    private readonly updateDeadlineUseCase: UpdateDeadlineUseCase,
    private readonly publishQuizUseCase:    PublishQuizUseCase,
    private readonly hideQuizUseCase:       HideQuizUseCase,
    private readonly getQuizUseCase:        GetQuizUseCase,
    private readonly getQuizListUseCase:    GetQuizListUseCase,
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
      const result = await this.hideQuizUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.body.reason
      );
      res.status(200).json(result);
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