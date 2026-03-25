import { AnswerItemDTO } from "./AnswerItemDTO";

// Request body khi frontend detect hết giờ và tự submit
// (POST /attempts/:attemptId/expire).
//
// Cùng shape với SubmitAttemptDTO — frontend gửi lên những câu
// student đã chọn tính đến thời điểm hết giờ.
//
// Khác biệt so với Submit ở Use Case, không phải ở DTO:
//   - Use Case gọi attempt.expire() thay vì attempt.submit()
//   - Không validate thời gian (đã biết là hết giờ)
//   - Status cuối = Expired thay vì Submitted
//
// answers có thể là [] — student chưa chọn câu nào → score = 0.
export interface ExpireAttemptDTO {
  answers: AnswerItemDTO[];
}