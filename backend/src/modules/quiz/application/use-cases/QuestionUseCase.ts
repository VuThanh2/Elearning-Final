import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { AddQuestionDTO } from "../dtos/AddQuestionDTO";
import { UpdateQuestionDTO } from "../dtos/UpdateQuestionDTO";
import { QuizDetailDTO } from "../dtos/QuizResponseDTO";
import { validateAddQuestion, validateUpdateQuestion } from "../validators/QuestionValidator";
import { validateAddAnswerOption } from "../validators/AnswerOptionValidator";
import { QuestionType } from "../../domain/value-objects/QuestionType";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

// Teacher thêm câu hỏi vào quiz (Draft hoặc Hidden).
//
// Flow:
//   1. Validate DTO (content, questionType, inline options nếu có)
//   2. Load quiz, kiểm tra tồn tại + ownership
//   3. quiz.addQuestion() — domain enforce assertEditable()
//   4. Nếu có inline options: thêm từng option qua quiz.addAnswerOption()
//   5. Persist
//   6. Trả về QuizDetailDTO

export class AddQuestionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    dto: AddQuestionDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate
    validateAddQuestion(dto);

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

    // Bước 3: thêm câu hỏi — domain enforce assertEditable()
    const now      = this.dateTimeProvider.now();
    const question = quiz.addQuestion({
      content:      dto.content.trim(),
      questionType: dto.questionType as QuestionType,
      now,
    });

    // Bước 4: thêm inline options nếu có
    // validateAddQuestion đã check từng option có content và isCorrect
    if (dto.answerOptions && dto.answerOptions.length > 0) {
      for (const optionDto of dto.answerOptions) {
        quiz.addAnswerOption({
          questionId: question.questionId,
          content:    optionDto.content!.trim(),
          isCorrect:  optionDto.isCorrect!,
          now,
        });
      }
    }

    // Bước 5: persist
    await this.quizRepository.save(quiz);

    // Bước 6: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}

// Teacher xóa câu hỏi khỏi quiz (Draft hoặc Hidden).
// Không cần DTO — questionId lấy từ URL param.
//
// Flow:
//   1. Load quiz, kiểm tra tồn tại + ownership
//   2. quiz.removeQuestion() — domain enforce assertEditable()
//   3. Persist
//   4. Trả về QuizDetailDTO

export class RemoveQuestionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    questionId: string
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

    // Bước 2: xóa câu hỏi — domain enforce assertEditable() + tìm câu hỏi
    const now = this.dateTimeProvider.now();
    quiz.removeQuestion(questionId, now);

    // Bước 3: persist
    await this.quizRepository.save(quiz);

    // Bước 4: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}

// Teacher sửa content của câu hỏi (Draft hoặc Hidden).
// questionType KHÔNG thể thay đổi — xóa và tạo lại nếu cần.
//
// Flow:
//   1. Validate DTO
//   2. Load quiz, kiểm tra tồn tại + ownership
//   3. quiz.updateQuestionContent() — domain enforce assertEditable()
//   4. Persist
//   5. Trả về QuizDetailDTO

export class UpdateQuestionUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly dateTimeProvider: IDateTimeProvider,
  ) {}

  async execute(
    teacherId: string,
    quizId: string,
    questionId: string,
    dto: UpdateQuestionDTO
  ): Promise<QuizDetailDTO> {
    // Bước 1: validate
    validateUpdateQuestion(dto);

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

    // Bước 3: cập nhật content — domain enforce assertEditable() + tìm câu hỏi
    const now = this.dateTimeProvider.now();
    quiz.updateQuestionContent({
      questionId,
      content: dto.content.trim(),
      now,
    });

    // Bước 4: persist
    await this.quizRepository.save(quiz);

    // Bước 5: trả về
    return QuizMapper.toDetailDTO(quiz);
  }
}