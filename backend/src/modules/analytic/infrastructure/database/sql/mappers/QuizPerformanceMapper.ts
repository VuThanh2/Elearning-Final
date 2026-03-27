import { QuizPerformanceView } from "../../../../domain/read-models/QuizPerformanceView";
import { QuizPerformanceModel } from "../models/QuizPerformanceModel";

// Chỉ có toDomain() — không có toPersistence().
//
// Tại sao không có toPersistence()?
//   Analytics Repository là read-only (IAnalyticsOracleRepository chỉ có find*).
//   Write path (upsert) do Projector đảm nhiệm và thao tác trực tiếp với Oracle —
//   Projector không đi qua Mapper mà tự build bind variables từ event payload.
//   → Mapper chỉ có 1 chiều: DB row → domain type.
export class QuizPerformanceMapper {

  static toDomain(row: QuizPerformanceModel): QuizPerformanceView {
    return {
      quizId:             row.QUIZ_ID,
      sectionId:          row.SECTION_ID,
      quizTitle:          row.QUIZ_TITLE,
      sectionName:        row.SECTION_NAME,
      totalAttempts:      row.TOTAL_ATTEMPTS,
      attemptedStudents:  row.ATTEMPTED_STUDENTS,
      totalStudents:      row.TOTAL_STUDENTS,
      averageScore:       row.AVERAGE_SCORE,
      highestScore:       row.HIGHEST_SCORE,
      lowestScore:        row.LOWEST_SCORE,
      completionRate:     row.COMPLETION_RATE,
      lastUpdatedAt:      row.LAST_UPDATED_AT,
    };
  }

  static toDomainList(rows: QuizPerformanceModel[]): QuizPerformanceView[] {
    return rows.map(QuizPerformanceMapper.toDomain);
  }
}