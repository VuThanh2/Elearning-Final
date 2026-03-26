// DTO đại diện cho một Section kèm theo context học thuật đầy đủ
// (course name, faculty name) để frontend render mà không cần gọi thêm request.
//
// Tại sao cần context đầy đủ?
//   - Teacher dashboard hiển thị: "Advanced OOP / Software Engineering / HK1 2024-2025"
//   - Student dashboard hiển thị tương tự
//   - Nếu chỉ trả sectionId, frontend phải gọi thêm N request để resolve tên
//     → N+1 problem
export interface SectionDTO {
  readonly sectionId:    string;
  readonly sectionName:  string;
  readonly sectionCode:  string;

  // Context học thuật — resolve từ hierarchy khi query
  readonly courseName:   string;
  readonly courseCode:   string;
  readonly facultyName:  string;
  readonly facultyCode:  string;
}