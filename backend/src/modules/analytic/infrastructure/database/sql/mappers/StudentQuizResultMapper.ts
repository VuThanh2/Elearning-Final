import { StudentQuizResultView, StudentQuizResultStatus } from "../../../../domain/read-models/StudentQuizResultView";
import { StudentQuizResultModel }                         from "../models/StudentQuizResultModel";

// Chỉ có toDomain() — không có toPersistence() (lý do giống QuizPerformanceMapper).
//
// Điểm chú ý: STATUS column Oracle là VARCHAR2 — cần assert kiểu tại đây.
//   DB constraint CHECK (STATUS IN ('SUBMITTED', 'EXPIRED')) đảm bảo
//   chỉ 2 giá trị hợp lệ tồn tại. Tuy nhiên TypeScript không biết điều đó,
//   nên dùng type assertion sau khi guard kiểm tra — throw sớm nếu data bị corrupt.
const VALID_STATUSES = new Set<string>(["SUBMITTED", "EXPIRED"]);

export class StudentQuizResultMapper {

  static toDomain(row: StudentQuizResultModel): StudentQuizResultView {
    if (!VALID_STATUSES.has(row.STATUS)) {
      throw new Error(
        `StudentQuizResultMapper: STATUS không hợp lệ "${row.STATUS}" ` +
        `cho attemptId "${row.ATTEMPT_ID}". Dữ liệu DB có thể bị corrupt.`
      );
    }

    return {
      attemptId:       row.ATTEMPT_ID,
      quizId:          row.QUIZ_ID,
      studentId:       row.STUDENT_ID,
      sectionId:       row.SECTION_ID,
      quizTitle:       row.QUIZ_TITLE,
      score:           row.SCORE,
      maxScore:        row.MAX_SCORE,
      percentage:      row.PERCENTAGE,
      startedAt:       row.STARTED_AT,
      submittedAt:     row.SUBMITTED_AT,
      durationSeconds: row.DURATION_SECONDS,
      attemptNumber:   row.ATTEMPT_NUMBER,
      status:          row.STATUS as StudentQuizResultStatus,
    };
  }

  static toDomainList(rows: StudentQuizResultModel[]): StudentQuizResultView[] {
    return rows.map(StudentQuizResultMapper.toDomain);
  }
}