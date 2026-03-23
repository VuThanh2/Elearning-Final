import { AddQuestionDTO } from "../dtos/AddQuestionDTO";
import { UpdateQuestionDTO } from "../dtos/UpdateQuestionDTO";
import { isValidQuestionType } from "../../domain/value-objects/QuestionType";

// Check:
//   ✓ content không rỗng
//   ✓ questionType là giá trị hợp lệ trong enum QuestionType
//   ✓ answerOptions nếu có: mỗi option phải có content và isCorrect
//
// KHÔNG check:
//   ✗ answerOptions đủ số lượng để publish → domain (assertReadyToPublish)
//   ✗ có ít nhất 1 correct answer          → domain (assertReadyToPublish)
//   ✗ quiz có tồn tại không                → use case

export function validateAddQuestion(dto: AddQuestionDTO): void {
  // content
  if (!dto.content || dto.content.trim().length === 0) {
    throw new Error("ValidationError: Nội dung câu hỏi không được để trống.");
  }

  // questionType
  if (!dto.questionType || !isValidQuestionType(dto.questionType)) {
    throw new Error(
      `ValidationError: questionType không hợp lệ. Giá trị cho phép: ${Object.values(
        // Liệt kê giá trị hợp lệ ngay trong message cho dễ debug
        { MultipleChoice: "MultipleChoice" }
      ).join(", ")}.`
    );
  }

  // answerOptions inline — nếu có thì validate từng option
  if (dto.answerOptions !== undefined) {
    if (!Array.isArray(dto.answerOptions)) {
      throw new Error(
        "ValidationError: answerOptions phải là một mảng."
      );
    }

    dto.answerOptions.forEach((option, index) => {
      if (!option.content || option.content.trim().length === 0) {
        throw new Error(
          `ValidationError: answerOptions[${index}].content không được để trống.`
        );
      }
      if (option.isCorrect === undefined || option.isCorrect === null) {
        throw new Error(
          `ValidationError: answerOptions[${index}].isCorrect là bắt buộc khi thêm option inline.`
        );
      }
    });
  }
}

// Chỉ có một field content — bắt buộc và không được rỗng.
export function validateUpdateQuestion(dto: UpdateQuestionDTO): void {
  if (!dto.content || dto.content.trim().length === 0) {
    throw new Error("ValidationError: Nội dung câu hỏi không được để trống.");
  }
}