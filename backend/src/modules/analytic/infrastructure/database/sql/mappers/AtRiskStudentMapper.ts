import { AtRiskStudentView, RiskLevel } from "../../../../domain/read-models/AtRiskStudentView";
import { AtRiskStudentModel }            from "../models/AtRiskStudentModel";

// Chỉ có toDomain() — không có toPersistence().
//
// Điểm chú ý: 2 cột risk level là VARCHAR2 Oracle.
//   DB constraint CHECK đảm bảo chỉ 'HIGH'|'MEDIUM'|'LOW'.
//   Mapper vẫn guard và throw để bắt data corrupt sớm —
//   nhất quán với StudentQuizResultMapper.
const VALID_RISK_LEVELS = new Set<string>(["HIGH", "MEDIUM", "LOW"]);

function assertRiskLevel(value: string, column: string, sectionId: string, studentId: string): RiskLevel {
  if (!VALID_RISK_LEVELS.has(value)) {
    throw new Error(
      `AtRiskStudentMapper: ${column} không hợp lệ "${value}" ` +
      `cho (sectionId="${sectionId}", studentId="${studentId}"). Dữ liệu DB có thể bị corrupt.`
    );
  }
  return value as RiskLevel;
}

export class AtRiskStudentMapper {

  static toDomain(row: AtRiskStudentModel): AtRiskStudentView {
    return {
      sectionId:              row.SECTION_ID,
      studentId:              row.STUDENT_ID,
      studentFullname:        row.STUDENT_FULLNAME,
      sectionName:            row.SECTION_NAME,
      totalQuizzes:           row.TOTAL_QUIZZES,
      attemptedQuizzes:       row.ATTEMPTED_QUIZZES,
      quizParticipationRate:  row.QUIZ_PARTICIPATION_RATE,
      averageScore:           row.AVERAGE_SCORE,
      lowestScore:            row.LOWEST_SCORE,
      participationRiskLevel: assertRiskLevel(
        row.PARTICIPATION_RISK_LEVEL,
        "PARTICIPATION_RISK_LEVEL",
        row.SECTION_ID,
        row.STUDENT_ID,
      ),
      averageScoreRiskLevel:  assertRiskLevel(
        row.AVG_SCORE_RISK_LEVEL,
        "AVG_SCORE_RISK_LEVEL",
        row.SECTION_ID,
        row.STUDENT_ID,
      ),
      lastUpdatedAt:          row.LAST_UPDATED_AT,
    };
  }

  static toDomainList(rows: AtRiskStudentModel[]): AtRiskStudentView[] {
    return rows.map(AtRiskStudentMapper.toDomain);
  }
}