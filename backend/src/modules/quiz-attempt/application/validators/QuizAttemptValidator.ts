import { AnswerItemDTO }    from "../dtos/AnswerItemDTO";
import { SubmitAttemptDTO } from "../dtos/SubmitAttemptDTO";
import { ExpireAttemptDTO } from "../dtos/ExpireAttemptDTO";

//   check những gì biết được từ input shape, không cần DB:
//     ✓ answers phải là array
//     ✓ mỗi AnswerItem phải có questionId không rỗng
//     ✓ selectedOptionIds phải là array ([] hợp lệ — bỏ câu)
//     ✓ không được gửi trùng questionId (One Answer Per Question)
//
//   Use Case — check những gì cần DB:
//     ✗ attemptId có tồn tại không
//     ✗ studentId có phải owner của attempt không
//     ✗ attempt có đang InProgress không
//     ✗ questionId có thuộc quiz không (Answer Must Belong to the Attempt Quiz)
//     ✗ thời gian có hợp lệ không (deadline, timeLimit)

// Submit 
export function validateSubmitAttempt(dto: SubmitAttemptDTO): void {
  // answers phải là array
  if (!Array.isArray(dto.answers)) {
    throw new Error(
      "ValidationError: answers phải là một mảng."
    );
  }

  // Validate từng AnswerItem
  for (let i = 0; i < dto.answers.length; i++) {
    const answer = dto.answers[i];
    
    // Đảm bảo phần tử không bị null hoặc undefined 
    if (!answer) {
      throw new Error(`ValidationError: answers[${i}] không hợp lệ (bị thiếu dữ liệu).`);
    }
    
    validateAnswerItem(answer, i);
  }

  // Không được gửi trùng questionId — One Answer Per Question
  checkDuplicateQuestions(dto.answers);
}

// Expire 
export function validateExpireAttempt(dto: ExpireAttemptDTO): void {
  // answers có thể là mảng rỗng — student chưa chọn câu nào khi hết giờ
  if (!Array.isArray(dto.answers)) {
    throw new Error(
      "ValidationError: answers phải là một mảng."
    );
  }

  // Validate từng AnswerItem nếu có
  for (let i = 0; i < dto.answers.length; i++) {
    const answer = dto.answers[i];
    
    if (!answer) {
      throw new Error(`ValidationError: answers[${i}] không hợp lệ (bị thiếu dữ liệu).`);
    }

    validateAnswerItem(answer, i);
  }

  // Không được gửi trùng questionId
  checkDuplicateQuestions(dto.answers);
}

// Shared helpers 
// Validate shape của 1 AnswerItem.
// index dùng để message lỗi rõ ràng hơn (e.g. "answers[2].questionId").
function validateAnswerItem(item: AnswerItemDTO, index: number): void {
  // questionId không được rỗng
  if (
    !item.questionId ||
    typeof item.questionId !== "string" ||
    item.questionId.trim().length === 0
  ) {
    throw new Error(
      `ValidationError: answers[${index}].questionId không được để trống.`
    );
  }

  // selectedOptionIds phải là array
  // [] hợp lệ — student bỏ câu này, earnedPoints = 0
  if (!Array.isArray(item.selectedOptionIds)) {
    throw new Error(
      `ValidationError: answers[${index}].selectedOptionIds phải là một mảng.`
    );
  }

  // Mỗi optionId trong array phải là string không rỗng
  for (let j = 0; j < item.selectedOptionIds.length; j++) {
    const optionId = item.selectedOptionIds[j];
    if (
      typeof optionId !== "string" ||
      optionId.trim().length === 0
    ) {
      throw new Error(
        `ValidationError: answers[${index}].selectedOptionIds[${j}] không được để trống.`
      );
    }
  }
}

// Kiểm tra không có questionId trùng lặp trong danh sách answers.
// Enforce rule: UNIQUE(attemptId, questionId) ở application layer
// trước khi xuống domain — fail fast, message rõ ràng hơn.
function checkDuplicateQuestions(answers: AnswerItemDTO[]): void {
  const seen = new Set<string>();

  for (const item of answers) {
    const qId = item.questionId.trim();
    if (seen.has(qId)) {
      throw new Error(
        `ValidationError: questionId "${qId}" bị gửi trùng — mỗi câu hỏi chỉ được trả lời một lần.`
      );
    }
    seen.add(qId);
  }
}