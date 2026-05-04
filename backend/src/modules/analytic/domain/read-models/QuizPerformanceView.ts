// Actor: Teacher
// Purpose: Thống kê tổng quan performance của 1 quiz trong 1 section.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: Oracle — cần AVG, COUNT, MAX, MIN trên dữ liệu tabular.
//          Precomputed để query nhanh, không JOIN runtime.
//
// Business Rules phản ánh:
//   - Rule: Analytics Must Be Section Scoped For Teachers
//     → sectionId bắt buộc, query luôn filter theo sectionId
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ attempt có status SUBMITTED hoặc EXPIRED mới được tính
//
// averageScore: AVG(score) trên tất cả finalized attempts của quiz.
//   Giữ retry failures hiển thị đúng: 0/100 và 100/100 thì average = 50.
//
// completionRate: attemptedStudents / totalStudents
//   totalStudents = số student enroll vào section (từ Academic Context)
//   attemptedStudents = số student distinct đã attempt quiz này
export interface QuizPerformanceView {
  // Identity -
  readonly quizId:    string;
  readonly sectionId: string;

  // Denormalized labels (tránh JOIN lúc query)
  readonly quizTitle:   string;
  readonly sectionName: string;

  // Attempt metrics 
  readonly totalAttempts:      number; // tổng số lượt attempt (kể cả retry)
  readonly attemptedStudents:  number; // số student distinct đã attempt ≥ 1 lần
  readonly totalStudents:      number; // tổng student enroll trong section

  // Score metrics
  readonly maxScore:      number; // max score configured for the quiz
  readonly averageScore: number; // AVG(score), làm tròn 2 chữ số
  readonly highestScore: number; // MAX(score)
  readonly lowestScore:  number; // MIN(score)

  // Derived (tính tại projection layer, lưu sẵn) 
  readonly completionRate: number; // attemptedStudents / totalStudents, 0–1

  // Metadata 
  readonly lastUpdatedAt: Date; // timestamp lần cuối projection được cập nhật
}
