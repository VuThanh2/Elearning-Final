import { AnswerItemDTO } from "./AnswerItemDTO";

// Request body khi student nộp bài (POST /attempts/:attemptId/submit).
//
// attemptId lấy từ URL param (:attemptId), không nằm trong body.
// studentId lấy từ JWT payload, không nằm trong body.
//
// answers: danh sách câu trả lời.
//   - Có thể thiếu câu — câu không gửi lên = 0 điểm (use case xử lý).
//   - selectedOptionIds = [] nếu student muốn bỏ câu cụ thể.
//   - Không được gửi trùng questionId — validator sẽ check.
export interface SubmitAttemptDTO {
  answers: AnswerItemDTO[];
}