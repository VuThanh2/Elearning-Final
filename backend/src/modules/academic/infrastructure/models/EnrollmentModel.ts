// Map 1-1 với schema của bảng ENROLLMENTS trong Oracle.
//
// Business Rule được enforce ở DB level:
//   - PK (STUDENT_ID, SECTION_ID): mỗi student chỉ enroll 1 lần / section
//   - FK SECTION_ID → ACADEMIC_UNITS nhưng cần CHECK hoặc Trigger
//     để enforce "Enrollment Must Reference a Section" (TYPE = 'SECTION'),
//     tương tự TEACHING_ASSIGNMENTS.
//
// Scope: CHỈ dùng trong infrastructure layer (AcademicRepository, AcademicMapper).
export interface EnrollmentModel {
  STUDENT_ID:    string;
  SECTION_ID:    string;
  TERM:          string;
  ACADEMIC_YEAR: string;
}