import { SectionWithContextRow }   from "../../domain/interface-repositories/IAcademicRepository";
import { SectionWithContextModel } from "../models/SectionWithContextModel";

// Chuyển đổi SectionWithContextModel (Oracle row, HOA) →
//            SectionWithContextRow   (domain type, camelCase).
//
// Caller:
//   - AcademicRepository.findSectionsByTeacherWithContext()
//   - AcademicRepository.findSectionsByStudentWithContext()
export class SectionWithContextMapper {

  static toDomain(row: SectionWithContextModel): SectionWithContextRow {
    return {
      term:         row.TERM,
      academicYear: row.ACADEMIC_YEAR,
      sectionId:    row.SECTION_ID,
      sectionName:  row.SECTION_NAME,
      sectionCode:  row.SECTION_CODE,
      courseId:     row.COURSE_ID,
      courseName:   row.COURSE_NAME,
      courseCode:   row.COURSE_CODE,
      facultyId:    row.FACULTY_ID,
      facultyName:  row.FACULTY_NAME,
      facultyCode:  row.FACULTY_CODE,
    };
  }

  static toDomainList(rows: SectionWithContextModel[]): SectionWithContextRow[] {
    return rows.map(SectionWithContextMapper.toDomain);
  }
}