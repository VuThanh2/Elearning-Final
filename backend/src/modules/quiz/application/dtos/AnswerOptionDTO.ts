// Phân biệt Add/Update ở HTTP method và URL:
//   POST   /quizzes/:quizId/questions/:questionId/options     → Add
//   PATCH  /quizzes/:quizId/questions/:questionId/options/:id → Update
//
// Sự khác nhau về required/optional được xử lý ở validator:
//   - Add use case:    content và isCorrect phải có (validator check not undefined)
//   - Update use case: cả hai optional, chỉ update field được gửi lên
//
// quizId, questionId, optionId (nếu có) lấy từ URL params.
// optionId khi Add được domain tự sinh (UUID) — không nhận từ client.
export interface AnswerOptionDTO {
  content?:   string;
  isCorrect?: boolean;
}