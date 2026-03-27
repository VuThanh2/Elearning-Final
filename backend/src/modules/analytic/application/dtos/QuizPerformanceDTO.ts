// Actor:   Teacher
// Route:   GET /analytics/sections/:sectionId/quizzes/:quizId/performance
//          GET /analytics/sections/:sectionId/performance
// Permission: VIEW_ANALYTICS
//
// Source:  QuizPerformanceView (Oracle — ANALYTICS_QUIZ_PERFORMANCE)
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired event → Projector MERGE INTO
//
// lastUpdatedAt: ISO 8601 string — frontend format tuỳ locale.
export interface QuizPerformanceDTO {
  readonly quizId:    string;
  readonly sectionId: string;

  readonly quizTitle:   string;
  readonly sectionName: string;

  readonly totalAttempts:     number; // tổng lượt attempt (kể cả retry)
  readonly attemptedStudents: number; // số student distinct đã attempt ≥ 1 lần
  readonly totalStudents:     number; // tổng student enroll trong section

  // Score metrics (bestScore per student)
  readonly averageScore: number; // AVG(bestScore per student), 2 decimal
  readonly highestScore: number; // MAX(bestScore per student)
  readonly lowestScore:  number; // MIN(bestScore per student)

  readonly completionRate: number; // attemptedStudents / totalStudents, 0–1

  readonly lastUpdatedAt: string; // ISO 8601
}