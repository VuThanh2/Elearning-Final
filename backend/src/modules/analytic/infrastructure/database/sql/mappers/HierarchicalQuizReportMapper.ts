import {
  HierarchicalQuizReportView,
  HierarchicalReportSummary,
  HierarchicalLevel,
} from "../../../../domain/read-models/HierarchicalQuizReportView";
import { HierarchicalQuizReportModel } from "../models/HierarchicalQuizReportModel";

// Chỉ có toDomain() — không có toPersistence().
//
// Mapper này có thêm method buildSummary() vì HierarchicalReportSummary
// không được lưu trực tiếp trong DB — nó được tính in-memory từ flat list.
//
// buildSummary() nhận flat list đã được filter ở Repository
// (ví dụ: đã WHERE FACULTY_ID = :id), rồi aggregate in-memory.
// Không query DB thêm lần nào.
export class HierarchicalQuizReportMapper {

  static toDomain(row: HierarchicalQuizReportModel): HierarchicalQuizReportView {
    return {
      facultyId:          row.FACULTY_ID,
      facultyName:        row.FACULTY_NAME,
      facultyCode:        row.FACULTY_CODE,
      courseId:           row.COURSE_ID,
      courseName:         row.COURSE_NAME,
      courseCode:         row.COURSE_CODE,
      sectionId:          row.SECTION_ID,
      sectionName:        row.SECTION_NAME,
      sectionCode:        row.SECTION_CODE,
      quizId:             row.QUIZ_ID,
      quizTitle:          row.QUIZ_TITLE,
      totalAttempts:      row.TOTAL_ATTEMPTS,
      attemptedStudents:  row.ATTEMPTED_STUDENTS,
      totalStudents:      row.TOTAL_STUDENTS,
      completionRate:     row.COMPLETION_RATE,
      averageScore:       row.AVERAGE_SCORE,
      lastUpdatedAt:      row.LAST_UPDATED_AT,
    };
  }

  static toDomainList(rows: HierarchicalQuizReportModel[]): HierarchicalQuizReportView[] {
    return rows.map(HierarchicalQuizReportMapper.toDomain);
  }

  // Tính HierarchicalReportSummary in-memory từ flat list.
  // Caller (Repository) truyền vào list đã filter theo đúng level + unitId.
  //
  // averageScore: weighted average — AVG(averageScore per quiz) không chính xác
  //   nếu các quiz có số lượng attempt khác nhau. Dùng:
  //   totalWeightedScore / totalAttemptedStudents
  //   trong đó totalWeightedScore = SUM(averageScore * attemptedStudents)
  //
  // Trả về null nếu list rỗng — không có data để tính summary.
  static buildSummary(
    level:   HierarchicalLevel,
    unitId:  string,
    unitName: string,
    rows:    HierarchicalQuizReportView[],
  ): HierarchicalReportSummary | null {
    if (rows.length === 0) return null;

    const totalQuizzes         = rows.length;
    const totalAttempts        = rows.reduce((s, r) => s + r.totalAttempts,      0);
    const totalAttemptedStudents = rows.reduce((s, r) => s + r.attemptedStudents, 0);
    const totalStudents        = rows.reduce((s, r) => s + r.totalStudents,      0);

    // Weighted average score
    const totalWeightedScore = rows.reduce(
      (s, r) => s + r.averageScore * r.attemptedStudents,
      0,
    );
    const averageScore = totalAttemptedStudents > 0
      ? Math.round((totalWeightedScore / totalAttemptedStudents) * 100) / 100
      : 0;

    const completionRate = totalStudents > 0
      ? Math.round((totalAttemptedStudents / totalStudents) * 10000) / 10000
      : 0;

    return {
      level,
      unitId,
      unitName,
      totalQuizzes,
      totalAttempts,
      averageScore,
      completionRate,
    };
  }
}