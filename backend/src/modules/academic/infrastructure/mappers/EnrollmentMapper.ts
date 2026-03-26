import { Enrollment }      from "../../domain/read-models/Enrollment";
import { EnrollmentModel } from "../models/EnrollmentModel";

// Chuyển đổi EnrollmentModel (Oracle row) → Enrollment (domain read model).
//
// Cùng lý do với TeachingAssignmentMapper:
//   Mapper là ranh giới duy nhất giữa Oracle row và domain interface.
//   Repository không tự map, không có nơi nào khác được map.
export class EnrollmentMapper {

  static toDomain(row: EnrollmentModel): Enrollment {
    return {
      studentId:    row.STUDENT_ID,
      sectionId:    row.SECTION_ID,
      term:         row.TERM,
      academicYear: row.ACADEMIC_YEAR,
    };
  }

  static toDomainList(rows: EnrollmentModel[]): Enrollment[] {
    return rows.map(EnrollmentMapper.toDomain);
  }
}