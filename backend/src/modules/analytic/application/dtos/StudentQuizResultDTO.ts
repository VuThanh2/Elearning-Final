// Actor:   Student
// Route:   GET /analytics/sections/:sectionId/my-results
//          GET /analytics/quizzes/:quizId/my-results
// Permission: VIEW_OWN_RESULT
//
// Source:  StudentQuizResultView (Oracle — ANALYTICS_STUDENT_QUIZ_RESULT)
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired event → Projector MERGE INTO
//
// studentId KHÔNG có trong DTO response — lấy từ JWT payload (req.user.userId).
// Student chỉ được xem kết quả của chính mình.
//
// durationSeconds → frontend tự format thành "20 phút 30 giây" hoặc "mm:ss"
//   Lý do không format sẵn: format phụ thuộc locale và UI context.
//
// status: "SUBMITTED" | "EXPIRED"
//   IN_PROGRESS không xuất hiện trong read model — projection chỉ ghi khi finalized.
export interface StudentQuizResultDTO {
  readonly attemptId: string;
  readonly quizId:    string;
  readonly sectionId: string;

  readonly quizTitle: string;

  readonly score:      number; // điểm đạt được
  readonly maxScore:   number; // điểm tối đa
  readonly percentage: number; // score / maxScore, 0–1

  readonly startedAt:       string; // ISO 8601
  readonly submittedAt:     string; // ISO 8601
  readonly durationSeconds: number; // submittedAt - startedAt (giây)

  readonly attemptNumber: number;          // thứ tự lần làm (bắt đầu từ 1)
  readonly status:        AttemptStatus;   // SUBMITTED | EXPIRED
}

// Status của attempt
export type AttemptStatus = "SUBMITTED" | "EXPIRED";