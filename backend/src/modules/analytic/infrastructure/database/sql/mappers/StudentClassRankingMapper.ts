import { StudentClassRankingView } from "../../../../domain/read-models/StudentClassRankingView";
import { StudentClassRankingModel } from "../models/StudentClassRankingModel";

// Chỉ có toDomain() — không có toPersistence().
//
// Không cần guard đặc biệt — tất cả field đều là NUMBER hoặc VARCHAR2
// không có enum constraint. Mapper chỉ đơn thuần rename ALLCAPS → camelCase.
export class StudentClassRankingMapper {

  static toDomain(row: StudentClassRankingModel): StudentClassRankingView {
    return {
      sectionId:            row.SECTION_ID,
      studentId:            row.STUDENT_ID,
      studentFullname:      row.STUDENT_FULLNAME,
      sectionName:          row.SECTION_NAME,
      averageScore:         row.AVERAGE_SCORE,
      totalAttempts:        row.TOTAL_ATTEMPTS,
      rankInSection:        row.RANK_IN_SECTION,
      totalRankedStudents:  row.TOTAL_RANKED_STUDENTS,
      percentile:           row.PERCENTILE,
      sectionAverageScore:  row.SECTION_AVERAGE_SCORE,
      sectionHighestScore:  row.SECTION_HIGHEST_SCORE,
      sectionLowestScore:   row.SECTION_LOWEST_SCORE,
      lastUpdatedAt:        row.LAST_UPDATED_AT,
    };
  }

  static toDomainList(rows: StudentClassRankingModel[]): StudentClassRankingView[] {
    return rows.map(StudentClassRankingMapper.toDomain);
  }
}