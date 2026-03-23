import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { AnswerOptionDTO } from "../dtos/AnswerOptionDTO";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { validateAddAnswerOption, validateUpdateAnswerOption } from "../validators/AnswerOptionValidator";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// Teacher thêm một option vào câu hỏi (Draft hoặc Hidden).
// optionId được domain tự sinh (UUID) — không nhận từ client.
//
// Flow:
//   1. Validate DTO (content required, isCorrect required)
//   2. Load quiz, kiểm tra tồn tại + ownership
//   3. quiz.addAnswerOption() — domain enforce assertEditable() + tìm câu hỏi
//   4. Persist
//   5. Trả về QuizDetailDTO
export class AddAnswerOptionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    questionId: string,
    dto: AnswerOptionDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate — Add yêu cầu cả content và isCorrect
    validateAddAnswerOption(dto);

    // Bước 2: load + ownership
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền chỉnh sửa quiz này."
      );
    }

    // Bước 3: thêm option — domain enforce:
    //   - assertEditable() (Draft/Hidden)
    //   - findQuestionOrThrow() (questionId phải tồn tại trong quiz)
    const now = this.dateTimeProvider.now();
    quiz.addAnswerOption({
      questionId,
      content:   dto.content!.trim(),
      isCorrect: dto.isCorrect!,
      now,
    });

    // Bước 4: persist
    await this.quizRepository.save(quiz);

    // Bước 5: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}

// Teacher xóa option khỏi câu hỏi (Draft hoặc Hidden).
// Không cần DTO — optionId lấy từ URL param.
//
// Lưu ý: domain KHÔNG check ngay lúc remove option có còn đủ correct answer
// hay không — invariant đó chỉ được enforce khi publish.
// Teacher tự do remove option trong lúc đang soạn thảo.
//
// Flow:
//   1. Load quiz, kiểm tra tồn tại + ownership
//   2. quiz.removeAnswerOption() — domain enforce assertEditable() + tìm câu hỏi + tìm option
//   3. Persist
//   4. Trả về QuizDetailDTO
export class RemoveAnswerOptionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    questionId: string,
    optionId: string
  ): Promise<QuizDetailDTO> {
    // Bước 1: load + ownership
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền chỉnh sửa quiz này."
      );
    }

    // Bước 2: xóa option
    const now = this.dateTimeProvider.now();
    quiz.removeAnswerOption({ questionId, optionId, now });

    // Bước 3: persist
    await this.quizRepository.save(quiz);

    // Bước 4: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}

// Teacher sửa content hoặc isCorrect của một option (Draft hoặc Hidden).
// Ít nhất một field phải được gửi lên.
//
// Flow:
//   1. Validate DTO (ít nhất một field)
//   2. Load quiz, kiểm tra tồn tại + ownership
//   3. quiz.updateAnswerOption() — domain enforce assertEditable() + tìm câu hỏi + tìm option
//   4. Persist
//   5. Trả về QuizDetailDTO
export class UpdateAnswerOptionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    questionId: string,
    optionId: string,
    dto: AnswerOptionDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate — Update yêu cầu ít nhất một field
    validateUpdateAnswerOption(dto);

    // Bước 2: load + ownership
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền chỉnh sửa quiz này."
      );
    }

    // Bước 3: update option — chỉ pass field nào được gửi lên
    const now = this.dateTimeProvider.now();
    quiz.updateAnswerOption({
      questionId,
      optionId,
      now,
      ...(dto.content !== undefined && { content: dto.content.trim() }),
      ...(dto.isCorrect !== undefined && { isCorrect: dto.isCorrect })
    });

    // Bước 4: persist
    await this.quizRepository.save(quiz);

    // Bước 5: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}