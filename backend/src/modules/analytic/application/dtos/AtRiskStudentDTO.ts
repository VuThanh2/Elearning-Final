// Actor:   Teacher
// Route:   GET /analytics/sections/:sectionId/at-risk
// Permission: VIEW_AT_RISK_STUDENTS
//
// Source:  AtRiskStudentView (Oracle — ANALYTICS_AT_RISK_STUDENT)
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired → Projector MERGE INTO
//
// Scope: Per Section — không phải per Quiz.
//   Business Rule: "At Risk Students Must Be Calculated Per Section"
//   → Student có thể làm tốt 1 quiz nhưng tổng thể vẫn at-risk.
//
// Authorization by data:
//   Teacher chỉ được xem section mình dạy.
export interface AtRiskStudentDTO {
  readonly studentId:       string;
  readonly studentFullname: string;

  readonly totalQuizzes:          number; // tổng quiz published trong section
  readonly attemptedQuizzes:      number; // số quiz student đã attempt ≥ 1 lần
  readonly quizParticipationRate: number; // attemptedQuizzes / totalQuizzes, 0–1

  readonly averageScore: number; // AVG(bestScore per quiz), 2 decimal
  readonly lowestScore:  number; // MIN(score) trong tất cả attempt đã submit

  // Risk assessment — 2 chiều độc lập
  readonly participationRiskLevel: RiskLevel; // theo participation rate
  readonly averageScoreRiskLevel:  RiskLevel; // theo percentile điểm trong section
}

// RiskLevel — 3 mức
export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

// Response trả về khi Teacher xem at-risk dashboard của 1 section
// GET /analytics/sections/:sectionId/at-risk → AtRiskSectionReportDTO
export interface AtRiskSectionReportDTO {
  readonly sectionId:   string;
  readonly sectionName: string;

  // Summary tổng quan
  readonly totalStudents:  number; // tổng student enrolled
  readonly rankedStudents: number; // số student có ít nhất 1 attempt (được xếp hạng)

  // Danh sách student — sắp xếp mặc định: averageScore ASC (điểm thấp lên đầu)
  // Frontend tự group / filter theo từng chiều risk level tuỳ UI context
  readonly students: AtRiskStudentDTO[];
}