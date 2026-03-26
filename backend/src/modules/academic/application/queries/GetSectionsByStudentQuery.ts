import { IAcademicRepository } from "../../domain/interface-repositories/IAcademicRepository";
import { EnrolledSectionDTO }  from "../dtos/EnrolledSectionDTO";

// TÁC DỤNG — Student dashboard: "Tôi đang học section nào?"
//
// Trả về danh sách Section Student đã enroll, kèm đủ context
// học thuật (sectionName, courseName, facultyName) để frontend
// render dashboard — Student biết mình đang học lớp nào, môn nào, khoa nào.
//
// Đây cũng là data Student cần để navigate vào section và xem
// danh sách quiz thuộc section đó (Quiz Context sẽ filter theo sectionId).
//
// Caller: AcademicController
//   GET /academic/sections/enrolled
//
// Flow:
//   JWT middleware → extract studentId từ token (req.user.userId)
//   Controller     → query.execute(studentId)
//   Query          → repository.findSectionsByStudentWithContext(studentId)
//   Repository     → 1 Oracle query, JOIN 3 tầng (không N+1)
//   Query          → map SectionWithContextRow[] → EnrolledSectionDTO[]
//   Controller     → res.json(dtos)
export class GetSectionsByStudentQuery {
  constructor(
    private readonly academicRepository: IAcademicRepository,
  ) {}

  async execute(studentId: string): Promise<EnrolledSectionDTO[]> {
    // Repository thực hiện JOIN 3 tầng trong 1 Oracle query:
    //   ENROLLMENTS → ACADEMIC_UNITS(section)
    //     → ACADEMIC_UNITS(course) → ACADEMIC_UNITS(faculty)
    // Query nhận rows đã đủ data, chỉ map sang DTO.
    const rows = await this.academicRepository
      .findSectionsByStudentWithContext(studentId);

    // Empty list = Student chưa enroll section nào → hợp lệ, không throw.
    return rows.map((row): EnrolledSectionDTO => ({
      sectionId:    row.sectionId,
      sectionName:  row.sectionName,
      sectionCode:  row.sectionCode,
      courseName:   row.courseName,
      courseCode:   row.courseCode,
      facultyName:  row.facultyName,
      facultyCode:  row.facultyCode,
      term:         row.term,
      academicYear: row.academicYear,
    }));
  }
}