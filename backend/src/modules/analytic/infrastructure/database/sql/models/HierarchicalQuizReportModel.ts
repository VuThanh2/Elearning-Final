// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: HierarchicalQuizReportView
//                     (domain/read-models/HierarchicalQuizReportView.ts)
//
// Thiết kế flat table (denormalized):
//   Mỗi row = 1 quiz × 1 section, chứa đầy đủ faculty/course/section info.
//   Tránh JOIN runtime với ACADEMIC_UNITS — Projector denormalize lúc upsert.
//   Presentation layer tự build tree từ flat list nếu cần render UI drill-down.
//
// Index IDX_HR_HIERARCHY: hỗ trợ query drill-down Admin
//   WHERE FACULTY_ID = :fid AND COURSE_ID = :cid AND SECTION_ID = :sid
export interface HierarchicalQuizReportModel {
  FACULTY_ID:         string;
  FACULTY_NAME:       string;
  FACULTY_CODE:       string;
  COURSE_ID:          string;
  COURSE_NAME:        string;
  COURSE_CODE:        string;
  SECTION_ID:         string;
  SECTION_NAME:       string;
  SECTION_CODE:       string;
  QUIZ_ID:            string;
  QUIZ_TITLE:         string;
  TOTAL_ATTEMPTS:     number;
  ATTEMPTED_STUDENTS: number;
  TOTAL_STUDENTS:     number;
  COMPLETION_RATE:    number; // 0.0000–1.0000
  AVERAGE_SCORE:      number;
  LAST_UPDATED_AT:    Date;
}