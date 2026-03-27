// Actor:   Teacher | Admin
// Route:   GET /analytics/sections/:sectionId/quizzes/:quizId/score-distribution
// Permission: VIEW_ANALYTICS
//
// Source:  ScoreDistributionView (Oracle — ANALYTICS_SCORE_DISTRIBUTION + ANALYTICS_SCORE_DISTRIBUTION_BUCKET)
//          2 bảng: header (1 row per quiz/section) + buckets (N rows per quiz/section)
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired → upsertScoreDistribution()
// rangeStart / rangeEnd: điểm thực tế (số, không phải %)
//   Tính = pct * maxScore, lưu sẵn để frontend hiển thị trực tiếp.
//
// percentage trong ScoreRangeBucketDTO: studentCount / totalRankedStudents
//   Tổng tất cả bucket = 1.0 (hoặc rất gần do làm tròn).
export interface ScoreDistributionDTO {
  readonly quizId:    string;
  readonly sectionId: string;

  readonly quizTitle:   string;
  readonly sectionName: string;
  readonly maxScore:    number; // điểm tối đa của quiz (để frontend render axis)

  readonly totalRankedStudents: number; // distinct student đã có ≥ 1 attempt finalized
  readonly lastUpdatedAt:       string; // ISO 8601

  // Histogram buckets (sắp xếp rangeStartPct ASC — thấp đến cao)
  readonly scoreRanges: ScoreRangeBucketDTO[];
}

// 1 bucket trong histogram — tổng quát, không ràng buộc số lượng
export interface ScoreRangeBucketDTO {
  // Label mô tả — "Dưới trung bình" | "Trung bình" | "Khá" | "Giỏi"
  readonly label: string;

  // Ngưỡng tỷ lệ (0.0 – 1.0)
  readonly rangeStartPct: number; // inclusive
  readonly rangeEndPct:   number; // exclusive, trừ bucket cuối

  // Ngưỡng điểm tuyệt đối (tính từ pct × maxScore)
  readonly rangeStart: number;
  readonly rangeEnd:   number;

  // true chỉ ở bucket cuối: [85–100] thay vì [85–100)
  readonly isUpperBoundInclusive: boolean;

  // Counts
  readonly studentCount: number; // số student có bestScore trong range này
  readonly percentage:   number; // studentCount / totalRankedStudents, 0–1
}