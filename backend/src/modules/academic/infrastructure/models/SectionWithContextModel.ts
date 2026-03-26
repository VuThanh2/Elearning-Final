// Map 1-1 với Oracle row trả về từ JOIN 3 tầng:
//   TEACHING_ASSIGNMENTS / ENROLLMENTS
//   → ACADEMIC_UNITS (section)
//   → ACADEMIC_UNITS (course)   via section.PARENT_ID
//   → ACADEMIC_UNITS (faculty)  via course.PARENT_ID
//
// Scope: CHỈ dùng trong infrastructure layer
//   (SectionWithContextMapper, AcademicRepository).
//   Domain và Application layer không biết type này tồn tại.
export interface SectionWithContextModel {
  // Từ TEACHING_ASSIGNMENTS hoặc ENROLLMENTS
  TERM:          string;
  ACADEMIC_YEAR: string;

  // Từ ACADEMIC_UNITS alias section (TYPE = 'SECTION')
  SECTION_ID:   string;
  SECTION_NAME: string;
  SECTION_CODE: string;

  // Từ ACADEMIC_UNITS alias course (TYPE = 'COURSE')
  COURSE_ID:   string;
  COURSE_NAME: string;
  COURSE_CODE: string;

  // Từ ACADEMIC_UNITS alias faculty (TYPE = 'FACULTY')
  FACULTY_ID:   string;
  FACULTY_NAME: string;
  FACULTY_CODE: string;
}