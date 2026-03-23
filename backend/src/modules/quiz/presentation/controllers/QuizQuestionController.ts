import { Request, Response } from "express";
import { AddQuestionUseCase, RemoveQuestionUseCase, UpdateQuestionUseCase } from "../../application/use-cases/QuestionUseCase";
import { AddAnswerOptionUseCase, RemoveAnswerOptionUseCase, UpdateAnswerOptionUseCase } from "../../application/use-cases/AnswerOptionUseCase";
import { AddQuestionDTO }    from "../../application/dtos/AddQuestionDTO";
import { UpdateQuestionDTO } from "../../application/dtos/UpdateQuestionDTO";
import { AnswerOptionDTO }   from "../../application/dtos/AnswerOptionDTO";

//xử lý các request liên quan đến Question và AnswerOption bên trong một Quiz.
//
// Tách khỏi QuizController vì:
//   - Số lượng endpoints nhiều (6 endpoints)
//   - Subject domain khác nhau (Question/AnswerOption vs Quiz)
//   - Dễ đọc và maintain hơn khi tách riêng

export class QuizQuestionController {
  constructor(
    private readonly addQuestionUseCase:        AddQuestionUseCase,
    private readonly removeQuestionUseCase:     RemoveQuestionUseCase,
    private readonly updateQuestionUseCase:     UpdateQuestionUseCase,
    private readonly addAnswerOptionUseCase:    AddAnswerOptionUseCase,
    private readonly removeAnswerOptionUseCase: RemoveAnswerOptionUseCase,
    private readonly updateAnswerOptionUseCase: UpdateAnswerOptionUseCase,
  ) {}

  // Question endpoints

  // POST /quizzes/:quizId/questions
  async addQuestion(
    req: Request<{ quizId: string }, {}, AddQuestionDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.addQuestionUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.body
      );
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // DELETE /quizzes/:quizId/questions/:questionId
  async removeQuestion(
    req: Request<{ quizId: string; questionId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.removeQuestionUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.params.questionId
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // PATCH /quizzes/:quizId/questions/:questionId
  async updateQuestion(
    req: Request<{ quizId: string; questionId: string }, {}, UpdateQuestionDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.updateQuestionUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.params.questionId,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // AnswerOption endpoints

  // POST /quizzes/:quizId/questions/:questionId/options
  async addAnswerOption(
    req: Request<{ quizId: string; questionId: string }, {}, AnswerOptionDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.addAnswerOptionUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.params.questionId,
        req.body
      );
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // DELETE /quizzes/:quizId/questions/:questionId/options/:optionId
  async removeAnswerOption(
    req: Request<{ quizId: string; questionId: string; optionId: string }>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.removeAnswerOptionUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.params.questionId,
        req.params.optionId
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // PATCH /quizzes/:quizId/questions/:questionId/options/:optionId
  async updateAnswerOption(
    req: Request<
      { quizId: string; questionId: string; optionId: string },
      {},
      AnswerOptionDTO
    >,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.updateAnswerOptionUseCase.execute(
        req.user!.userId,
        req.params.quizId,
        req.params.questionId,
        req.params.optionId,
        req.body
      );
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// mapErrorToStatus — dùng chung trong file này
// Convention error prefix của Quiz Context — xem QuizController.ts
function mapErrorToStatus(message: string): number {
  if (message.startsWith("ValidationError:"))   return 400;
  if (message.startsWith("NotFoundError:"))     return 404;
  if (message.startsWith("AccessDeniedError:")) return 403;
  if (message.startsWith("DomainError:"))       return 422;
  return 500;
}