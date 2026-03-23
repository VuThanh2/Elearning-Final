//port để Quiz Context xác minh dữ liệu từ Academic Context mà không vi phạm bounded context boundary.
//
// Quiz Context KHÔNG query thẳng vào DB của Academic Context.
// Thay vào đó, Academic Context implement interface này và cung cấp
// các method cần thiết cho Quiz Context sử dụng.

export interface IAcademicIntegrationProvider {
  // Kiểm tra section có tồn tại và là SECTION type không
  // (không phải FACULTY hay COURSE)
  sectionExists(sectionId: string): Promise<boolean>;

  // Kiểm tra Teacher có TeachingAssignment cho section này không
  // Business rule: Teacher chỉ được tạo quiz cho section mình dạy
  isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean>;
}