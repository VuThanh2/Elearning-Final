// Tất cả field đều optional — Teacher chỉ gửi field cần thay đổi.
// Use case chỉ update field nào có giá trị (không undefined).
//
// deadline KHÔNG nằm ở đây — có business rule riêng (chỉ được tăng,
// không được giảm) nên tách ra UpdateDeadlineDTO xử lý độc lập.

export interface UpdateQuizDTO {
  title?:            string;
  description?:      string;
  timeLimitMinutes?: number;  // phút, phải > 0 nếu có
  maxAttempts?:      number;  // >= 1 nếu có
  maxScore?:         number;  // > 0 nếu có
}