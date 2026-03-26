// Map 1-1 với schema của bảng TEACHING_ASSIGNMENTS trong Oracle.
//
// Business Rule được enforce ở DB level:
//   - PK (TEACHER_ID, SECTION_ID) đảm bảo "Teachers Cannot Be Assigned to the Same Section"
//   - FK SECTION_ID → ACADEMIC_UNITS nhưng cần thêm CHECK hoặc Trigger
//     để enforce "Teaching Assignment Must Reference a Section" (TYPE = 'SECTION')
//     vì FK đơn thuần không filter theo TYPE.
//
// Scope: CHỈ dùng trong infrastructure layer (AcademicRepository, AcademicMapper).
export interface TeachingAssignmentModel {
  TEACHER_ID:    string;
  SECTION_ID:    string;
  TERM:          string;
  ACADEMIC_YEAR: string;
}