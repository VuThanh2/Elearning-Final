// Actor: Teacher / Admin
// Purpose: Phân tầng điểm số của một quiz theo các khoảng (histogram).
//          Giúp Teacher / Admin thấy được phân phối điểm của lớp.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: Oracle — GROUP BY + WIDTH_BUCKET() hoặc CASE WHEN
//          để phân điểm vào histogram buckets.
//
// Business Rules phản ánh:
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ tính bestScore per student (không đếm nhiều attempt của 1 student)
//   - Rule: Analytics Must Be Section Scoped For Teachers
//     → Teacher chỉ thấy section mình dạy; Admin thấy tất cả
//
// studentCount: distinct studentId — nếu student attempt nhiều lần,
//   chỉ tính bestScore, không đếm lặp.
// percentage: studentCount / totalRankedStudents, tổng tất cả bucket = 1.0
export interface ScoreDistributionView {
  // Identity
  readonly quizId:    string;
  readonly sectionId: string;

  // Denormalized 
  readonly quizTitle:   string;
  readonly sectionName: string;
  readonly maxScore:    number; // điểm tối đa của quiz

  // Summary
  readonly totalRankedStudents: number; // distinct student có ≥ 1 attempt submitted
  readonly lastUpdatedAt:       Date;

  // Distribution buckets (flexible — số lượng do projection layer quyết định)
  readonly scoreRanges: readonly ScoreRangeBucket[];
}

// Một bucket trong histogram — tổng quát, không ràng buộc số lượng
export interface ScoreRangeBucket {
  // Label mô tả ngắn gọn — do projection layer gán, ví dụ "Dưới trung bình", "Khá"
  readonly label: string;

  // Ngưỡng theo % (0.0–1.0) — độc lập với maxScore
  // Dùng để presentation layer render axis label động
  readonly rangeStartPct: number; // inclusive
  readonly rangeEndPct:   number; // exclusive, trừ bucket cuối

  // Ngưỡng tuyệt đối (điểm thực tế) — tính = pct * maxScore, lưu sẵn để query
  readonly rangeStart: number;
  readonly rangeEnd:   number;

  // true chỉ ở bucket cuối: [85–100] thay vì [85–100)
  readonly isUpperBoundInclusive: boolean;

  // Số student có bestScore nằm trong range này
  readonly studentCount: number;

  // studentCount / totalRankedStudents, 0–1
  readonly percentage: number;
}