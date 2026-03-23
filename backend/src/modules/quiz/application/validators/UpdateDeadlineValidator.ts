import { UpdateDeadlineDTO } from "../dtos/UpdateDeadlineDTO";
import { validateDeadlineString } from "./QuizValidator";

// Delegate hoàn toàn sang validateDeadlineString (shared helper trong
// validateQuiz.ts) vì logic giống hệt nhau: ISO 8601 + tương lai.
//
// KHÔNG check:
//   ✗ deadlineAt > deadline hiện tại của quiz
//     → business rule cần load quiz từ DB
//     → use case delegate xuống quiz.updateDeadline()
//       rồi Deadline.mustBeAfter() enforce trong domain
export function validateUpdateDeadline(dto: UpdateDeadlineDTO): void {
  validateDeadlineString(dto.deadlineAt);
}