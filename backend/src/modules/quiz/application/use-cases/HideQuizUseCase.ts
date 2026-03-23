import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { IEventPublisher } from "../interfaces/IEventPublisher";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { QuizHidden } from "../../domain/events/QuizHidden";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// reason là optional string — Teacher có thể ghi lý do ẩn.
// Không có DTO riêng — reason đọc trực tiếp từ req.body.reason ở Controller.
//
// Flow:
//   1. Load quiz, kiểm tra tồn tại
//   2. Kiểm tra Teacher là owner
//   3. quiz.hide(reason, now) — domain check: chỉ Published mới hide được
//   4. Persist
//   5. Publish QuizHidden event
//   6. Trả về QuizDetailDTO

export class HideQuizUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    reason?: string
  ): Promise<QuizDetailDTO> {
    // Bước 1: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 2: ownership check
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền ẩn quiz này."
      );
    }

    // Bước 3: domain check trạng thái (chỉ Published mới hide được)
    const now = this.dateTimeProvider.now();
    quiz.hide(reason?.trim() ?? null, now);

    // Bước 4: persist
    await this.quizRepository.save(quiz);

    // Bước 5: publish event
    await this.eventPublisher.publish(
      new QuizHidden(quiz.quizId, teacherId, quiz.sectionId, reason?.trim() ?? null)
    );

    // Bước 6: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}