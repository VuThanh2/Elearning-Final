// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: StudentQuizResultView (domain/read-models/StudentQuizResultView.ts)
//
// Mỗi row = 1 attempt — không upsert theo (studentId, quizId) mà upsert theo attemptId.
// 1 student nhiều lần attempt → nhiều row, phân biệt bằng ATTEMPT_NUMBER.
//
// DURATION_SECONDS: SUBMITTED_AT - STARTED_AT tính bằng giây.
//   Lưu sẵn để tránh tính lại mỗi lần SELECT — presentation layer chỉ format.
//
// STATUS check constraint ở Oracle:
//   CONSTRAINT CHK_SQR_STATUS CHECK (STATUS IN ('SUBMITTED', 'EXPIRED'))
export interface StudentQuizResultModel {
  ATTEMPT_ID:       string;
  QUIZ_ID:          string;
  STUDENT_ID:       string;
  SECTION_ID:       string;
  QUIZ_TITLE:       string;
  SCORE:            number;
  MAX_SCORE:        number;
  PERCENTAGE:       number; // 0.0000–1.0000
  STARTED_AT:       Date;
  SUBMITTED_AT:     Date;
  DURATION_SECONDS: number;
  ATTEMPT_NUMBER:   number;
  STATUS:           "SUBMITTED" | "EXPIRED";
}