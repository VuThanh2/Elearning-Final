// Actor:   Admin
// Route:   GET /analytics/hierarchical-report
//          GET /analytics/hierarchical-report/faculty/:facultyId
//          GET /analytics/hierarchical-report/course/:courseId
//          GET /analytics/hierarchical-report/summary?level=FACULTY&unitId=...
// Permission: VIEW_HIERARCHICAL_REPORT
//
// Source:  HierarchicalQuizReportView (Oracle — ANALYTICS_HIERARCHICAL_REPORT)
//          Recursive CTE (CONNECT BY PRIOR / WITH RECURSIVE) để traverse
//          Faculty → Course → Section hierarchy, JOIN với quiz/attempt data.
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired → upsertHierarchicalReport()
//
// averageScore: AVG(bestScore per student) — nhất quán với QuizPerformanceView.
// completionRate: attemptedStudents / totalStudents.

// Flat list DTO (dùng cho export, bảng dữ liệu) 
export interface HierarchicalReportRowDTO {
  // Faculty
  readonly facultyId:   string;
  readonly facultyName: string;
  readonly facultyCode: string;

  // Course
  readonly courseId:   string;
  readonly courseName: string;
  readonly courseCode: string;

  // Section
  readonly sectionId:   string;
  readonly sectionName: string;
  readonly sectionCode: string;

  // Quiz
  readonly quizId:    string;
  readonly quizTitle: string;

  // Metrics
  readonly totalAttempts:     number; // tổng lượt attempt
  readonly attemptedStudents: number; // distinct student đã attempt ≥ 1 lần
  readonly totalStudents:     number; // tổng student enroll trong section
  readonly completionRate:    number; // attemptedStudents / totalStudents, 0–1
  readonly averageScore:      number; // AVG(bestScore per student), 2 decimal

  // Metadata
  readonly lastUpdatedAt: string; // ISO 8601
}

// Nested tree DTO (dùng cho drill-down UI) 
// Root: toàn bộ report dạng tree
export interface HierarchicalReportTreeDTO {
  readonly generatedAt: string; // ISO 8601 — thời điểm Query Service build tree
  readonly faculties:   FacultyReportDTO[];
}

export interface FacultyReportDTO {
  readonly facultyId:   string;
  readonly facultyName: string;
  readonly facultyCode: string;

  // Aggregate của toàn Faculty — tính từ tất cả quiz bên trong
  readonly summary: HierarchicalSummaryDTO;

  readonly courses: CourseReportDTO[];
}

export interface CourseReportDTO {
  readonly courseId:   string;
  readonly courseName: string;
  readonly courseCode: string;

  // Aggregate của toàn Course
  readonly summary: HierarchicalSummaryDTO;

  readonly sections: SectionReportDTO[];
}

export interface SectionReportDTO {
  readonly sectionId:   string;
  readonly sectionName: string;
  readonly sectionCode: string;

  // Aggregate của toàn Section
  readonly summary: HierarchicalSummaryDTO;

  readonly quizzes: HierarchicalReportRowDTO[];
}

// Summary tổng hợp theo 1 cấp — dùng bởi FacultyReportDTO, CourseReportDTO, SectionReportDTO
// Tính ở Query Service bằng cách aggregate từ tất cả leaf quiz bên dưới.
export interface HierarchicalSummaryDTO {
  readonly totalQuizzes:      number; // tổng quiz có data trong scope
  readonly totalAttempts:     number; // tổng attempt trong scope
  readonly averageScore:      number; // AVG(averageScore) across all quizzes
  readonly completionRate:    number; // AVG(completionRate) across all quizzes
}

// --- Summary DTO (dùng cho GET /summary?level=FACULTY&unitId=...) ---
// Trả về 1 dòng summary cho 1 đơn vị cụ thể — không trả về toàn bộ tree.
export interface HierarchicalUnitSummaryDTO {
  readonly level:    HierarchicalLevel; // FACULTY | COURSE | SECTION
  readonly unitId:   string;
  readonly unitName: string;

  readonly totalQuizzes:   number;
  readonly totalAttempts:  number;
  readonly averageScore:   number;
  readonly completionRate: number;
}

// Level trong hierarchy — mirror từ domain type
export type HierarchicalLevel = "FACULTY" | "COURSE" | "SECTION";