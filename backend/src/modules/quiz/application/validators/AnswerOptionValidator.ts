import { AnswerOptionDTO } from "../dtos/AnswerOptionDTO";

// Khi Add: content và isCorrect đều bắt buộc vì đây là option hoàn chỉnh
// dù AnswerOptionDTO khai báo cả hai là optional (để dùng chung với Update).
//
// Check:
//   ✓ content phải có và không rỗng
//   ✓ isCorrect phải có (boolean)
//
// KHÔNG check:
//   ✗ số lượng option đủ cho publish → domain (assertReadyToPublish)
//   ✗ quiz/question có tồn tại không → use case

export function validateAddAnswerOption(dto: AnswerOptionDTO): void {
  if (!dto.content || dto.content.trim().length === 0) {
    throw new Error(
      "ValidationError: Nội dung câu trả lời không được để trống."
    );
  }

  if (dto.isCorrect === undefined || dto.isCorrect === null) {
    throw new Error(
      "ValidationError: isCorrect là bắt buộc khi thêm câu trả lời."
    );
  }

  if (typeof dto.isCorrect !== "boolean") {
    throw new Error(
      "ValidationError: isCorrect phải là giá trị boolean (true/false)."
    );
  }
}

// Khi Update: cả hai field đều optional — nhưng phải gửi ít nhất một.
//
// Check:
//   ✓ Ít nhất một field được gửi lên
//   ✓ content: nếu có thì không rỗng
//   ✓ isCorrect: nếu có thì phải là boolean

export function validateUpdateAnswerOption(dto: AnswerOptionDTO): void {
  // Phải có ít nhất một field để update
  if (dto.content === undefined && dto.isCorrect === undefined) {
    throw new Error(
      "ValidationError: Phải có ít nhất một field để cập nhật (content hoặc isCorrect)."
    );
  }

  // content — nếu gửi lên thì không được rỗng
  if (dto.content !== undefined && dto.content.trim().length === 0) {
    throw new Error(
      "ValidationError: Nội dung câu trả lời không được để trống."
    );
  }

  // isCorrect — nếu gửi lên thì phải là boolean
  if (dto.isCorrect !== undefined && typeof dto.isCorrect !== "boolean") {
    throw new Error(
      "ValidationError: isCorrect phải là giá trị boolean (true/false)."
    );
  }
}