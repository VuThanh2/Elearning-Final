// Actor:   Student (xem rank bản thân) | Teacher (xem toàn bộ bảng xếp hạng section)
// Route:   GET /analytics/sections/:sectionId/my-ranking          (Student)
//          GET /analytics/sections/:sectionId/class-ranking        (Teacher)
// Permission:
//   Student → VIEW_CLASS_RANKING
//   Teacher → VIEW_ANALYTICS
//
// Source:  StudentClassRankingView (Oracle — ANALYTICS_STUDENT_CLASS_RANKING)
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired → upsertClassRankingForSection()
//          Recalculate toàn bộ section mỗi khi có attempt mới — đảm bảo rank chính xác.
//
// Authorization by data:
//   Student: studentId lấy từ JWT — chỉ thấy rank của chính mình.
export interface StudentClassRankingDTO {
  // Identity (không có studentId trong response của Student — lấy từ JWT)
  readonly sectionId: string;

  readonly sectionName:     string;
  readonly studentFullname: string; // chỉ có khi Student xem rank bản thân

  readonly averageScore:  number; // AVG(per-quiz attempt average) của student này
  readonly totalAttempts: number; // tổng attempt đã làm trong section

  readonly rankInSection:       number; // DENSE_RANK(), bắt đầu từ 1
  readonly totalRankedStudents: number; // số student được xếp hạng (đã attempt ≥ 1 quiz)
  readonly percentile:          number; // PERCENT_RANK(), 0–1

  // Section context (để student so sánh bản thân với lớp)
  readonly sectionAverageScore: number;
  readonly sectionHighestScore: number;
  readonly sectionLowestScore:  number;

  readonly lastUpdatedAt: string; // ISO 8601
}
