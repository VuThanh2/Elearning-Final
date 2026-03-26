// Public contract của Academic Context.
// Module khác chỉ được phép biết interface này —
// không import AcademicQueryService (concrete class) hay bất cứ
// thứ gì khác bên trong Academic Context.
export interface IAcademicQueryService {
  // Dùng bởi: Quiz Context 
  // Verify sectionId Teacher nhập vào thực sự tồn tại
  // và là đơn vị cấp SECTION (không phải FACULTY / COURSE).
  sectionExists(sectionId: string): Promise<boolean>;
 
  // Dùng bởi: Quiz Context 
  // Verify Teacher chỉ được tạo quiz cho section mình được assign.
  // Rule: "Teacher Can Only Manage Sections They Are Assigned To"
  isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string,
  ): Promise<boolean>;
 
  // Dùng bởi: Quiz Attempt Context
  // Verify Student chỉ được làm quiz thuộc section mình đã enroll.
  // Rule: "Quiz Access Must Match Enrollment"
  isStudentEnrolledInSection(
    studentId: string,
    sectionId: string,
  ): Promise<boolean>;
 
  // TODO: Thêm khi Analytics Context cần resolve section metadata
  // để build HierarchicalQuizReportView mà không self-query Oracle.
  // getSectionMetadata(sectionId: string): Promise<SectionDTO | null>;
 
  // TODO: Thêm khi một cross-context use case cần biết
  // toàn bộ section của Teacher (ví dụ: batch notification).
  // getSectionsByTeacher(teacherId: string): Promise<TeachingSectionDTO[]>;
 
  // TODO: Thêm khi một cross-context use case cần biết
  // toàn bộ section của Student (ví dụ: batch grade export).
  // getSectionsByStudent(studentId: string): Promise<EnrolledSectionDTO[]>;
}