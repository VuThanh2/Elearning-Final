// Actor:   Student
// Route:   GET /analytics/attempts/:attemptId/answer-review
//          GET /analytics/quizzes/:quizId/my-answer-history
// Permission: VIEW_OWN_RESULT
//
// Source:  StudentQuizAnswerView (MongoDB — analytics_student_quiz_answers)
// Trigger: QuizAttemptSubmitted / QuizAttemptExpired event → replaceOne upsert
//
// Ownership enforcement:
//   Query Service nhận studentId từ JWT, so sánh với studentId trong document.
//   Nếu không khớp → throw AccessDeniedError.
export interface StudentQuizAnswerDTO {
  readonly attemptId:     string;
  readonly quizId:        string;
  readonly sectionId:     string;

  // Summary 
  readonly totalScore:    number;  // tổng điểm đạt được
  readonly maxScore:      number;  // tổng điểm tối đa
  readonly percentage:    number;  // totalScore / maxScore, 0–1
  readonly submittedAt:   string;  // ISO 8601
  readonly attemptNumber: number;  // thứ tự lần làm
  readonly status:        "SUBMITTED" | "EXPIRED";

  // Chi tiết từng câu trả lời
  readonly answers: AnswerItemDTO[];
}

// Chi tiết 1 câu hỏi trong review — hiển thị đúng/sai, đáp án đúng
export interface AnswerItemDTO {
  readonly questionId:      string;
  readonly questionContent: string; // nội dung câu hỏi tại thời điểm làm bài

  // Student's answer
  readonly selectedOptionIds:      readonly string[]; // optionId student đã chọn
  readonly selectedOptionContents: readonly string[]; // nội dung option đó

  // Correct answer
  readonly correctOptionIds:      readonly string[]; // optionId đúng
  readonly correctOptionContents: readonly string[]; // nội dung đáp án đúng

  // Grading result
  readonly isCorrect:      boolean; // student trả lời đúng hoàn toàn?
  readonly earnedPoints:   number;  // điểm đạt được cho câu này
  readonly questionPoints: number;  // điểm tối đa của câu này
}