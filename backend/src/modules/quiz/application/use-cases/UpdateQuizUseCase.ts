import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { UpdateQuizDTO } from "../dtos/UpdateQuizDTO";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { validateUpdateQuiz } from "../validators/QuizValidator";
import { TimeLimit } from "../../domain/value-objects/TimeLimit";
import { MaxAttempts } from "../../domain/value-objects/MaxAttempts";
import { Points } from "../../domain/value-objects/Points";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// Áp dụng khi quiz ở trạng thái Draft hoặc Hidden.
// Guard assertEditable() được enforce bên trong domain entity.
//
// Flow:
//   1. Validate format DTO
//   2. Load quiz, kiểm tra tồn tại
//   3. Kiểm tra Teacher là owner của quiz
//   4. Gọi các mutation method tương ứng trên domain entity
//   5. Persist
//   6. Trả về QuizDetailDTO

export class UpdateQuizUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    dto: UpdateQuizDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate format
    validateUpdateQuiz(dto);

    // Bước 2: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 3: chỉ owner mới được sửa
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền chỉnh sửa quiz này."
      );
    }

    // Bước 4: apply mutations — domain entity enforce assertEditable()
    const now = this.dateTimeProvider.now();

    // updateInfo xử lý title và description trong 1 call
    if (dto.title !== undefined || dto.description !== undefined) {
      quiz.updateInfo({
        now,
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      });
    }

    if (dto.timeLimitMinutes !== undefined) {
      quiz.updateTimeLimit(TimeLimit.create(dto.timeLimitMinutes), now);
    }

    if (dto.maxAttempts !== undefined) {
      quiz.updateMaxAttempts(MaxAttempts.create(dto.maxAttempts), now);
    }

    if (dto.maxScore !== undefined) {
      quiz.updateMaxScore(Points.create(dto.maxScore), now);
    }

    // Bước 5: persist
    await this.quizRepository.save(quiz);

    // Bước 6: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}