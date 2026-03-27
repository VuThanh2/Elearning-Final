// Actor:   Teacher
// Route:   GET /analytics/sections/:sectionId/quizzes/:quizId/question-failure-rate
// Permission: VIEW_ANALYTICS
//
// Source:  QuestionFailureRateView (MongoDB — analytics_question_failure_rate)
//   _id = "{quizId}_{sectionId}"
//   1 document = 1 quiz × 1 section, embedded questions[]
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired
//          → Projector dùng MongoDB $inc để cộng dồn wrongAnswers / correctAnswers
//
// Authorization by data:
//   Teacher chỉ xem được quiz thuộc section mình dạy.
//
// failureRate: wrongAnswers / totalQuestionAttempts
//   Nếu totalQuestionAttempts = 0 → failureRate = 0 (null-safe).
export interface QuestionFailureRateDTO {
  readonly quizId:    string;
  readonly sectionId: string;

  readonly quizTitle:   string;
  readonly sectionName: string;

  readonly totalSubmittedAttempts: number;  // tổng attempt finalized trong scope
  readonly hasInsufficientData:    boolean; // true nếu < MIN_SAMPLE
  readonly lastUpdatedAt:          string;  // ISO 8601

  // Per-question stats (sắp xếp failureRate DESC — câu hay sai nhất lên đầu)
  readonly questions: QuestionFailureStatDTO[];
}

// Thống kê tỷ lệ sai cho 1 câu hỏi 
export interface QuestionFailureStatDTO {
  // Identity
  readonly questionId:      string;
  readonly questionContent: string; // nội dung câu hỏi

  // Raw counts 
  readonly totalQuestionAttempts: number; // số lần câu này được trả lời
  readonly correctAnswers:        number; // số lần đúng
  readonly wrongAnswers:          number; // số lần sai
  readonly unansweredCount:       number; // số lần bỏ trống

  // Derived — chỉ failureRate
  readonly failureRate: number; // wrongAnswers / totalQuestionAttempts, 0–1
                                // null-safe: nếu totalQuestionAttempts = 0 → 0

  // Distractor analysis — giúp Teacher cải thiện câu hỏi
  readonly mostSelectedWrongOptionId:      string | null;
  readonly mostSelectedWrongOptionContent: string | null;
}