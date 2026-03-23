// (Rule – Deadline Constraints: chỉ được tăng, không được rút ngắn).
//
// Use case sẽ load quiz hiện tại, so sánh deadline mới với cũ,
// rồi delegate xuống quiz.updateDeadline() để enforce domain rule.
export interface UpdateDeadlineDTO {
  deadlineAt: string;  // ISO 8601 string, parse sang Date ở use case
}