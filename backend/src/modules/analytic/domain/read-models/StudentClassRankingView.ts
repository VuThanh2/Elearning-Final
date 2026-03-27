// Actor: Student
// Purpose: Student xem thứ hạng của mình trong Section.
//          Hiển thị rank cá nhân + điểm trung bình so với lớp.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: Oracle — cần RANK() / DENSE_RANK() OVER (PARTITION BY sectionId).
//
// Business Rules phản ánh:
//   - Rule: Ranking Must Be Calculated Within Section
//     → Student chỉ thấy rank trong section của mình, không so sánh toàn trường
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ attempt SUBMITTED / EXPIRED
//
// rankInSection: dùng DENSE_RANK() PARTITION BY sectionId ORDER BY averageScore DESC
// totalRankedStudents: số student có ít nhất 1 attempt trong section
//   (chỉ student đã làm quiz mới được xếp hạng)
//
// sectionAverageScore: trung bình điểm của toàn section
//   Dùng để student tự so sánh mình với mức trung bình lớp.
//
// percentile: phần trăm student có điểm thấp hơn student này
//   Ví dụ: percentile = 0.85 → "bạn đang ở top 15% lớp"
//   Công thức: PERCENT_RANK() OVER (PARTITION BY sectionId ORDER BY averageScore)
export interface StudentClassRankingView {
  // Identity 
  readonly sectionId: string;
  readonly studentId: string;

  // Denormalized 
  readonly sectionName:     string;
  readonly studentFullname: string;

  // Student's score 
  readonly averageScore:    number; // AVG(bestScore per quiz) của student này
  readonly totalAttempts:   number; // tổng số attempt student đã làm trong section

  // Ranking 
  readonly rankInSection:       number; // DENSE_RANK() trong section, bắt đầu từ 1
  readonly totalRankedStudents: number; // tổng số student được xếp hạng trong section
  readonly percentile:          number; // PERCENT_RANK(), 0–1 (cao hơn = giỏi hơn)

  // Section context (để student so sánh)
  readonly sectionAverageScore: number; // trung bình điểm toàn section
  readonly sectionHighestScore: number; // điểm cao nhất trong section
  readonly sectionLowestScore:  number; // điểm thấp nhất trong section

  // Metadata 
  readonly lastUpdatedAt: Date;
}