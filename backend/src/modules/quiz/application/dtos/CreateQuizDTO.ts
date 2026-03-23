// Teacher nhập ở bước đầu, quiz được tạo ở trạng thái Draft.
// Câu hỏi được thêm riêng sau qua AddQuestionDTO.
//
// teacherId KHÔNG nằm trong DTO — lấy từ JWT payload (req.user.userId)
// để tránh Teacher giả mạo teacherId của người khác.
export interface CreateQuizDTO {
  sectionId:       string;
  title:           string;
  description:     string;
  timeLimitMinutes: number;  // phút, phải > 0
  deadlineAt:      string;   // ISO 8601, parse sang Date ở use case
  maxAttempts:     number;   // >= 1
  maxScore:        number;   // > 0
}