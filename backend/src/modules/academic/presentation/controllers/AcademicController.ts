import { Request, Response }           from "express";
import { GetSectionsByTeacherQuery }   from "../../application/queries/GetSectionsByTeacherQuery";
import { GetSectionsByStudentQuery }   from "../../application/queries/GetSectionsByStudentQuery";

// Trách nhiệm duy nhất: nhận HTTP request → gọi Query → trả response.
// Không có business logic ở đây.
//
// userId luôn lấy từ req.user (JWT payload đã verify bởi middleware) —
// không bao giờ nhận từ body hay param để tránh impersonation.
// → Teacher chỉ thấy section của mình, Student chỉ thấy section của mình.
//
// Cả 2 routes đều dùng chung permission VIEW_SECTION (đã seed cho
// Student, Teacher, Admin) — không cần tách authorize riêng theo role.
// Authorization by data: teacherId/studentId lấy từ JWT
// → không thể query data của người khác dù cùng permission.
//
// Error mapping:
//   Lỗi không mong đợi từ Query/Repository → 500 Internal Server Error
//   (Academic Module chỉ read, không có NotFoundError hay ValidationError
//   vì empty list là response hợp lệ — không throw khi không có data)
export class AcademicController {
  constructor(
    private readonly getSectionsByTeacherQuery: GetSectionsByTeacherQuery,
    private readonly getSectionsByStudentQuery: GetSectionsByStudentQuery,
  ) {}

  // GET /academic/sections/teaching
  //
  // Teacher xem danh sách Section mình đang dạy.
  // Dùng cho: Teacher dashboard — hiển thị "Section của tôi"
  //           Teacher cần biết sectionId nào để tạo quiz
  //
  // teacherId lấy từ JWT — Teacher không thể query section của Teacher khác.
  // Response 200: TeachingSectionDTO[]
  //   Empty array [] nếu Teacher chưa được assign section nào — hợp lệ.
  async getSectionsByTeacher(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const sections = await this.getSectionsByTeacherQuery.execute(
        req.user!.userId,
      );
      res.status(200).json(sections);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(500).json({ message });
    }
  }

  // GET /academic/sections/enrolled
  //
  // Student xem danh sách Section mình đang học.
  // Dùng cho: Student dashboard — hiển thị "Khóa học của tôi"
  //           Student cần biết sectionId nào để navigate vào xem quiz
  //
  // studentId lấy từ JWT — Student không thể query section của Student khác.
  // Response 200: EnrolledSectionDTO[]
  //   Empty array [] nếu Student chưa enroll section nào — hợp lệ.
  async getSectionsByStudent(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const sections = await this.getSectionsByStudentQuery.execute(
        req.user!.userId,
      );
      res.status(200).json(sections);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi không xác định.";
      res.status(500).json({ message });
    }
  }
}