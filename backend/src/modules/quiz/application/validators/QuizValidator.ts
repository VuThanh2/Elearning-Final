import { CreateQuizDTO } from "../dtos/CreateQuizDTO";
import { UpdateQuizDTO } from "../dtos/UpdateQuizDTO";

// Check (những gì biết được từ input, không cần DB):
//   ✓ sectionId không rỗng
//   ✓ title không rỗng
//   ✓ timeLimitMinutes là số nguyên > 0
//   ✓ deadlineAt là ISO 8601 hợp lệ và là thời điểm trong tương lai
//   ✓ maxAttempts là số nguyên >= 1
//   ✓ maxScore là số > 0
//
// KHÔNG check:
//   ✗ sectionId có tồn tại không           → use case (Academic Context)
//   ✗ Teacher có được dạy section không    → use case (Academic Context)

export function validateCreateQuiz(dto: CreateQuizDTO): void {
  // sectionId
  if (!dto.sectionId || dto.sectionId.trim().length === 0) {
    throw new Error("ValidationError: sectionId không được để trống.");
  }

  // title
  if (!dto.title || dto.title.trim().length === 0) {
    throw new Error("ValidationError: Tiêu đề quiz không được để trống.");
  }

  // timeLimitMinutes
  if (
    dto.timeLimitMinutes === undefined ||
    dto.timeLimitMinutes === null ||
    !Number.isInteger(dto.timeLimitMinutes) ||
    dto.timeLimitMinutes <= 0
  ) {
    throw new Error(
      "ValidationError: Thời gian làm bài phải là số nguyên lớn hơn 0 (phút)."
    );
  }

  // deadlineAt
  validateDeadlineString(dto.deadlineAt);

  // maxAttempts
  if (
    dto.maxAttempts === undefined ||
    dto.maxAttempts === null ||
    !Number.isInteger(dto.maxAttempts) ||
    dto.maxAttempts < 1
  ) {
    throw new Error(
      "ValidationError: Số lần làm tối đa phải là số nguyên >= 1."
    );
  }

  // maxScore
  if (
    dto.maxScore === undefined ||
    dto.maxScore === null ||
    typeof dto.maxScore !== "number" ||
    dto.maxScore <= 0
  ) {
    throw new Error("ValidationError: Điểm tối đa phải lớn hơn 0.");
  }
}

// Kiểm tra format/shape của UpdateQuizDTO trước khi use case xử lý.
// Tất cả field đều optional — chỉ validate field nào được gửi lên.
//
// Check:
//   ✓ Ít nhất một field được gửi lên
//   ✓ title: nếu có thì không rỗng
//   ✓ timeLimitMinutes: nếu có thì là số nguyên > 0
//   ✓ maxAttempts: nếu có thì là số nguyên >= 1
//   ✓ maxScore: nếu có thì > 0

export function validateUpdateQuiz(dto: UpdateQuizDTO): void {
  // Phải có ít nhất một field để update
  const hasAnyField =
    dto.title            !== undefined ||
    dto.description      !== undefined ||
    dto.timeLimitMinutes !== undefined ||
    dto.maxAttempts      !== undefined ||
    dto.maxScore         !== undefined;

  if (!hasAnyField) {
    throw new Error(
      "ValidationError: Phải có ít nhất một field để cập nhật."
    );
  }

  // title — nếu gửi lên thì không được rỗng
  if (dto.title !== undefined && dto.title.trim().length === 0) {
    throw new Error("ValidationError: Tiêu đề quiz không được để trống.");
  }

  // timeLimitMinutes — nếu gửi lên thì phải là số nguyên > 0
  if (dto.timeLimitMinutes !== undefined) {
    if (!Number.isInteger(dto.timeLimitMinutes) || dto.timeLimitMinutes <= 0) {
      throw new Error(
        "ValidationError: Thời gian làm bài phải là số nguyên lớn hơn 0 (phút)."
      );
    }
  }

  // maxAttempts — nếu gửi lên thì phải là số nguyên >= 1
  if (dto.maxAttempts !== undefined) {
    if (!Number.isInteger(dto.maxAttempts) || dto.maxAttempts < 1) {
      throw new Error(
        "ValidationError: Số lần làm tối đa phải là số nguyên >= 1."
      );
    }
  }

  // maxScore — nếu gửi lên thì phải > 0
  if (dto.maxScore !== undefined) {
    if (typeof dto.maxScore !== "number" || dto.maxScore <= 0) {
      throw new Error("ValidationError: Điểm tối đa phải lớn hơn 0.");
    }
  }
}

// Private helper — dùng chung cho cả hai validators trên

// Extract ra helper vì cùng logic xuất hiện ở cả validateCreateQuiz
// lẫn validateUpdateDeadline (file riêng) — tránh duplicate.
// Tuy nhiên validateUpdateDeadline import trực tiếp helper này
// thay vì export ra ngoài để không làm public API phức tạp hơn cần.
export function validateDeadlineString(deadlineAt: string): void {
  if (!deadlineAt || deadlineAt.trim().length === 0) {
    throw new Error("ValidationError: Deadline không được để trống.");
  }

  const deadline = new Date(deadlineAt);
  if (isNaN(deadline.getTime())) {
    throw new Error(
      "ValidationError: Deadline không đúng định dạng ISO 8601."
    );
  }

  if (deadline <= new Date()) {
    throw new Error(
      "ValidationError: Deadline phải là thời điểm trong tương lai."
    );
  }
}