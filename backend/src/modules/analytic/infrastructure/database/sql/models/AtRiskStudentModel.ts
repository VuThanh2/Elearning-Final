// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: AtRiskStudentView (domain/read-models/AtRiskStudentView.ts)
//
// Upsert key: (SECTION_ID, STUDENT_ID) — mỗi student có đúng 1 row per section.
//
// Risk level thresholds (enforce ở Projector, không ở Oracle):
//   participationRiskLevel:
//     HIGH   → QUIZ_PARTICIPATION_RATE < 0.50
//     MEDIUM → QUIZ_PARTICIPATION_RATE >= 0.50 AND < 0.80
//     LOW    → QUIZ_PARTICIPATION_RATE >= 0.80
//
//   avgScoreRiskLevel: dùng PERCENT_RANK() tại thời điểm upsert
//     HIGH   → bottom 10%  (PERCENT_RANK < 0.10)
//     MEDIUM → bottom 10–25% (PERCENT_RANK >= 0.10 AND < 0.25)
//     LOW    → top 75% (PERCENT_RANK >= 0.25)
//
// Check constraints ở Oracle:
//   CONSTRAINT CHK_ARS_PART_RISK CHECK (PARTICIPATION_RISK_LEVEL IN ('HIGH','MEDIUM','LOW'))
//   CONSTRAINT CHK_ARS_SCORE_RISK CHECK (AVG_SCORE_RISK_LEVEL    IN ('HIGH','MEDIUM','LOW'))
export interface AtRiskStudentModel {
  SECTION_ID:               string;
  STUDENT_ID:               string;
  STUDENT_FULLNAME:         string;
  SECTION_NAME:             string;
  TOTAL_QUIZZES:            number;
  ATTEMPTED_QUIZZES:        number;
  QUIZ_PARTICIPATION_RATE:  number; // 0.0000–1.0000
  AVERAGE_SCORE:            number;
  LOWEST_SCORE:             number;
  PARTICIPATION_RISK_LEVEL: "HIGH" | "MEDIUM" | "LOW";
  AVG_SCORE_RISK_LEVEL:     "HIGH" | "MEDIUM" | "LOW";
  LAST_UPDATED_AT:          Date;
}