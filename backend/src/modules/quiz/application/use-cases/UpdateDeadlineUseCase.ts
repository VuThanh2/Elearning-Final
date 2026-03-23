import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { UpdateDeadlineDTO } from "../dtos/UpdateDeadlineDTO";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { validateUpdateDeadline } from "../validators/UpdateDeadlineValidator";
import { Deadline } from "../../domain/value-objects/Deadline";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// Tách riêng khỏi UpdateQuizUseCase vì business rule đặc biệt:
//   newDeadline > currentDeadline (Rule – Deadline Constraints)
//
// Flow:
//   1. Validate format deadline string
//   2. Load quiz, kiểm tra tồn tại
//   3. Kiểm tra Teacher là owner
//   4. Gọi quiz.updateDeadline() — domain enforce:
//      - assertEditable() (chỉ Draft/Hidden)
//      - newDeadline.mustBeAfter(currentDeadline)
//   5. Persist
//   6. Trả về QuizDetailDTO

export class UpdateDeadlineUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    dto: UpdateDeadlineDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate format + tương lai
    validateUpdateDeadline(dto);

    // Bước 2: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 3: ownership check
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền chỉnh sửa quiz này."
      );
    }

    // Bước 4: tạo Deadline value object mới rồi delegate xuống domain
    // Deadline.create() check: deadline > createdAt
    // quiz.updateDeadline() check:
    //   - assertEditable() → chỉ Draft/Hidden
    //   - newDeadline.mustBeAfter(currentDeadline) → chỉ tăng
    const now         = this.dateTimeProvider.now();
    const newDeadline = Deadline.create(new Date(dto.deadlineAt), quiz.createdAt);

    quiz.updateDeadline(newDeadline, now);

    // Bước 5: persist
    await this.quizRepository.save(quiz);

    // Bước 6: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}