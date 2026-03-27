// Actor: Admin
// Purpose: Báo cáo tổng hợp toàn trường theo cấu trúc phân cấp học thuật.
//          Admin có thể drill-down từ Faculty → Course → Section → Quiz
//          để so sánh performance giữa các đơn vị.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: Oracle — cần recursive CTE (CONNECT BY PRIOR hoặc WITH RECURSIVE)
//          để traverse Faculty → Course → Section hierarchy,
//          sau đó JOIN với quiz/attempt data.
//
// Business Rules phản ánh:
//   - Rule: Analytics Must Respect Academic Hierarchy
//     → cấu trúc bắt buộc: Faculty → Course → Section → Quiz
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ attempt SUBMITTED / EXPIRED
//
// averageScore: AVG(bestScore per student) — nhất quán với QuizPerformanceView
// completionRate: attemptedStudents / totalStudents
export interface HierarchicalQuizReportView {
  // Một record = 1 quiz trong hierarchy

  // Faculty level
  readonly facultyId:   string;
  readonly facultyName: string;
  readonly facultyCode: string;

  // Course level
  readonly courseId:   string;
  readonly courseName: string;
  readonly courseCode: string;

  // Section level
  readonly sectionId:   string;
  readonly sectionName: string;
  readonly sectionCode: string;

  // Quiz level
  readonly quizId:    string;
  readonly quizTitle: string;

  // Metrics (nhất quán với QuizPerformanceView) 
  readonly totalAttempts:     number; // tổng số lượt attempt
  readonly attemptedStudents: number; // số student distinct đã attempt
  readonly totalStudents:     number; // tổng student enroll trong section
  readonly completionRate:    number; // attemptedStudents / totalStudents, 0–1
  readonly averageScore:      number; // AVG(bestScore per student)

  // Metadata 
  readonly lastUpdatedAt: Date;
}

// Dùng khi Admin muốn xem tổng hợp ở cấp Faculty hoặc Course
// thay vì drill-down từng quiz. Application layer tính từ flat list.
//
// Ví dụ: Admin chọn Faculty F01 → tính averageScore của tất cả quiz trong F01
export interface HierarchicalReportSummary {
  readonly level:           HierarchicalLevel;
  readonly unitId:          string; // facultyId / courseId / sectionId
  readonly unitName:        string;
  readonly totalQuizzes:    number;
  readonly totalAttempts:   number;
  readonly averageScore:    number;
  readonly completionRate:  number;
}

export type HierarchicalLevel = "FACULTY" | "COURSE" | "SECTION";