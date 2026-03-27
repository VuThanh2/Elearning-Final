// Scope: CHỈ dùng trong infrastructure layer (AnalyticsOracleRepository, mapper).
//        Domain và Application layer không biết type này tồn tại.
//
// Mapping tới domain: QuizPerformanceView (domain/read-models/QuizPerformanceView.ts)
//
// COMPLETION_RATE: lưu sẵn = ATTEMPTED_STUDENTS / TOTAL_STUDENTS
//   Tính lúc upsert để tránh tính lại mỗi lần SELECT.
//   Giá trị 0 nếu TOTAL_STUDENTS = 0 (tránh division by zero).
export interface QuizPerformanceModel {
  QUIZ_ID:            string;
  SECTION_ID:         string;
  QUIZ_TITLE:         string;
  SECTION_NAME:       string;
  TOTAL_ATTEMPTS:     number;
  ATTEMPTED_STUDENTS: number;
  TOTAL_STUDENTS:     number;
  AVERAGE_SCORE:      number;
  HIGHEST_SCORE:      number;
  LOWEST_SCORE:       number;
  COMPLETION_RATE:    number; // 0.0000–1.0000
  LAST_UPDATED_AT:    Date;
}