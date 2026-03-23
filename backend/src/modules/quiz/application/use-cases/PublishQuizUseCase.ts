import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { IEventPublisher } from "../interfaces/IEventPublisher";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { QuizPublished } from "../../domain/events/QuizPublished";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

//tất cả invariants được enforce tập trung tại quiz.publish():
//   - Quiz không ở trạng thái Expired
//   - Deadline chưa qua
//   - Có ít nhất 1 câu hỏi
//   - Mỗi câu hỏi có >= 2 options (MultipleChoice) và >= 1 correct answer
//
// Không cần DTO input — quizId lấy từ URL param, teacherId từ JWT.
//
// Flow:
//   1. Load quiz, kiểm tra tồn tại
//   2. Kiểm tra Teacher là owner
//   3. quiz.publish(now) — domain enforce toàn bộ invariants
//   4. Persist
//   5. Publish QuizPublished event
//   6. Trả về QuizDetailDTO

export class PublishQuizUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(
    teacherId: string,
    quizId: string
  ): Promise<QuizDetailDTO> {
    // Bước 1: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 2: ownership check
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền publish quiz này."
      );
    }

    // Bước 3: domain enforce tất cả invariants
    const now = this.dateTimeProvider.now();
    quiz.publish(now);

    // Bước 4: persist
    await this.quizRepository.save(quiz);

    // Bước 5: publish event → Analytics Context cập nhật projection
    await this.eventPublisher.publish(
      new QuizPublished(quiz.quizId, teacherId, quiz.sectionId)
    );

    // Bước 6: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}