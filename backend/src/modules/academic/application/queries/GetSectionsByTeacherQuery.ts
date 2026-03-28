import { IAcademicRepository } from "../../domain/interface-repositories/IAcademicRepository";
import { TeachingSectionDTO }  from "../dtos/TeachingSectionDTO";

//   queries/GetSectionsByTeacherQuery  →  INTERNAL boundary 
//     Presentation Layer của CHÍNH Academic Module gọi vào.
//     Trả về TeachingSectionDTO[] để Controller serialize thành HTTP response.
//     AcademicQueryService không bao giờ được gọi file này.
//
// TÁC DỤNG — Teacher dashboard: "Tôi đang dạy section nào?"
//
// Trả về danh sách Section Teacher được assign dạy, kèm đủ context
// học thuật (sectionName, courseName, facultyName) để frontend render
// dashboard card mà không cần thêm request nào.
//
// Caller: AcademicController
//   GET /academic/sections/teaching
//
// Flow:
//   JWT middleware → extract teacherId từ token (req.user.userId)
//   Controller     → query.execute(teacherId)
//   Query          → repository.findSectionsByTeacherWithContext(teacherId)
//   Repository     → 1 Oracle query, JOIN 3 tầng (không N+1)
//   Query          → map SectionWithContextRow[] → TeachingSectionDTO[]
//   Controller     → res.json(dtos)
export class GetSectionsByTeacherQuery {
  constructor(
    private readonly academicRepository: IAcademicRepository,
  ) {}

  async execute(teacherId: string): Promise<TeachingSectionDTO[]> {
    // Repository thực hiện JOIN 3 tầng trong 1 Oracle query:
    //   TEACHING_ASSIGNMENTS → ACADEMIC_UNITS(section)
    //     → ACADEMIC_UNITS(course) → ACADEMIC_UNITS(faculty)
    // Query nhận rows đã đủ data, chỉ map sang DTO.
    const rows = await this.academicRepository
      .findSectionsByTeacherWithContext(teacherId);

    // Empty list = Teacher chưa được assign section nào → hợp lệ, không throw.
    return rows.map((row): TeachingSectionDTO => ({
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