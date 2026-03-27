// Actor: Teacher
// Purpose: Thống kê tỷ lệ trả lời sai từng câu hỏi trong một quiz.
//          Giúp Teacher xác định câu hỏi nào student hay mắc sai nhất
//          để điều chỉnh giảng dạy.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: MongoDB — cần aggregation pipeline ($unwind answers, $group by questionId).
//          Không phù hợp Oracle vì answers là mảng lồng nhau trong attempt document.
//
// Business Rules phản ánh:
//   - Rule: Analytics Must Be Section Scoped For Teachers
//     → sectionId bắt buộc, Teacher chỉ xem section mình dạy
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ tính từ attempt SUBMITTED hoặc EXPIRED
//
// Công thức:
//   failureRate = wrongAnswers / totalQuestionAttempts
//   (số lần trả lời sai / tổng số lần câu đó được trả lời)
//
// mostSelectedWrongOptionId: optionId được chọn sai nhiều nhất.
//   Dùng để Teacher hiểu "distractor" (lựa chọn gây nhầm lẫn) nào
//   hiệu quả nhất, từ đó cải thiện câu hỏi.
//   null nếu không có lần nào trả lời sai.
//
// Mỗi document trong MongoDB = 1 quiz × 1 section.
// questions[] là embedded array chứa thống kê từng câu.
export interface QuestionFailureRateView {
  // Document identity
  readonly quizId:    string;
  readonly sectionId: string;

  // Denormalized labels
  readonly quizTitle:   string;
  readonly sectionName: string;

  // Metadata
  readonly totalSubmittedAttempts: number; // tổng attempt đã submit trong scope này
  readonly lastUpdatedAt:          Date;

  // Per-question stats (embedded array) 
  readonly questions: readonly QuestionFailureStat[];
}

// Thống kê tỷ lệ sai cho 1 câu hỏi — embedded trong QuestionFailureRateView
export interface QuestionFailureStat {
  // Identity 
  readonly questionId: string;

  // Denormalized content
  readonly questionContent: string; // nội dung câu hỏi

  // Metrics
  readonly totalQuestionAttempts: number; // số lần câu này được trả lời
  readonly correctAnswers:        number; // số lần trả lời đúng
  readonly wrongAnswers:          number; // số lần trả lời sai
  readonly unansweredCount:       number; // số lần bỏ trống (câu chưa được trả lời)

  // Derived
  readonly failureRate: number; // wrongAnswers / totalQuestionAttempts, 0–1
                                // null-safe: nếu totalQuestionAttempts = 0 → 0

  // Distractor analysis
  readonly mostSelectedWrongOptionId:      string | null; // optionId sai phổ biến nhất
  readonly mostSelectedWrongOptionContent: string | null; // nội dung của option đó
}