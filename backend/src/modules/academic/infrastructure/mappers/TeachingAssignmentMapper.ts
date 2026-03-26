import { TeachingAssignment }      from "../../domain/read-models/TeachingAssignment";
import { TeachingAssignmentModel } from "../models/TeachingAssignmentModel";

// Chuyển đổi TeachingAssignmentModel (Oracle row) → TeachingAssignment (domain read model).
//
// Vì TeachingAssignment là interface (không phải class), toDomain()
// trả về object literal thay vì gọi reconstruct().
// Không cần validation ở đây vì DB constraint đã đảm bảo data hợp lệ.
export class TeachingAssignmentMapper {

  static toDomain(row: TeachingAssignmentModel): TeachingAssignment {
    return {
      teacherId:    row.TEACHER_ID,
      sectionId:    row.SECTION_ID,
      term:         row.TERM,
      academicYear: row.ACADEMIC_YEAR,
    };
  }

  static toDomainList(rows: TeachingAssignmentModel[]): TeachingAssignment[] {
    return rows.map(TeachingAssignmentMapper.toDomain);
  }
}