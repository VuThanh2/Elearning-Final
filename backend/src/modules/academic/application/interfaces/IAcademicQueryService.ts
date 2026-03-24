// Public contract của Academic Context.
// Module khác chỉ được phép biết interface này —
// không import AcademicQueryService (concrete class) hay bất cứ
// thứ gì khác bên trong Academic Context.
export interface IAcademicQueryService {
  sectionExists(sectionId: string): Promise<boolean>;

  isTeacherAssignedToSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean>;

  isStudentEnrolledInSection(
    studentId: string,
    sectionId: string
  ): Promise<boolean>;
}