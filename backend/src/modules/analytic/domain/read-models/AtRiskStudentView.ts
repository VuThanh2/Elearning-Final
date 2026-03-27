// Actor: Teacher
// Purpose: Xác định Student có nguy cơ học kém trong một Section.
//          Giúp Teacher can thiệp sớm với những Student cần hỗ trợ.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: Oracle — cần window function (PERCENTILE_CONT, PERCENT_RANK)
//          và GROUP BY phức tạp trên dữ liệu tabular.
//
// Business Rules phản ánh:
//   - Rule: At Risk Students Must Be Calculated Per Section
//     → scope là section, không phải per quiz
//   - Rule: Analytics Must Be Section Scoped For Teachers
//     → Teacher chỉ thấy data của section mình dạy
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ attempt SUBMITTED / EXPIRED được tính vào averageScore
//
//   participationRiskLevel: Rủi ro theo tỷ lệ hoàn thành Quiz
//     Công thức: quizParticipationRate = attemptQuizzes / totalQuizzes
//     HIGH   → participationRate < 0.5  (bỏ quá nhiều quiz)
//     MEDIUM → participationRate < 0.8
//     LOW    → participationRate >= 0.8
//
//   averageScoreRiskLevel: Rủi ro theo điểm trung bình
//     Tính theo PERCENT_RANK trong section.
//     HIGH   → bottom 10%  (điểm thuộc nhóm thấp nhất)
//     MEDIUM → bottom 10%–25%
//     LOW    → top 75% trở lên
//
// averageScore: AVG(bestScore per quiz) — dùng best score vì
//   student được phép làm nhiều lần, điểm cao nhất mới phản ánh năng lực.
//
// lowestScore: điểm thấp nhất trong tất cả quiz đã attempt
//   (kể cả attempt đầu tiên, không lọc best) — để phát hiện
//   student có 1 quiz rất tệ dù trung bình ổn.
export interface AtRiskStudentView {
  // Identity 
  readonly sectionId: string;
  readonly studentId: string;

  // Denormalized
  readonly studentFullname: string;
  readonly sectionName:     string;

  // Quiz participation
  readonly totalQuizzes:          number; // tổng số quiz published trong section
  readonly attemptedQuizzes:      number; // số quiz student đã attempt ≥ 1 lần
  readonly quizParticipationRate: number; // attemptedQuizzes / totalQuizzes, 0–1

  // Score 
  readonly averageScore: number; // AVG(bestScore per quiz), làm tròn 2 chữ số
  readonly lowestScore:  number; // MIN(score) trong tất cả attempt đã submit

  // Risk assessment 
  readonly participationRiskLevel: RiskLevel; // đánh giá theo participation rate
  readonly averageScoreRiskLevel:  RiskLevel; // đánh giá theo điểm trung bình

  // Metadata
  readonly lastUpdatedAt: Date;
}

// RiskLevel — 3 mức, dùng chung cho cả 2 chiều đánh giá
export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";