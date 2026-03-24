// Interface repository của Academic Context.
// Chỉ Academic Context nội bộ mới được implement và dùng interface này.
// Module khác truy cập Academic Context qua AcademicQueryService, không qua đây.
export interface IAcademicRepository {
  // Kiểm tra unitId có tồn tại và có type = SECTION không
  sectionExists(sectionId: string): Promise<boolean>;

  // Kiểm tra Teacher có TeachingAssignment cho section này không
  isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean>;

  // Kiểm tra Student có Enrollment trong section này không
  isStudentEnrolledInSection(
    studentId: string,
    sectionId: string
  ): Promise<boolean>;
}