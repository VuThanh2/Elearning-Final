// Actor: Student
// Purpose: Student xem lại chi tiết từng câu trả lời sau khi nộp bài.
//          Là "answer review" screen — hiển thị đúng/sai, điểm từng câu,
//          nội dung câu hỏi và đáp án đúng.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: MongoDB — dữ liệu nested (answers là mảng document), không cần JOIN.
//          Một document = toàn bộ review của 1 attempt.
//          Tại sao không Oracle: unwind mảng answers trong SQL rất kém hiệu quả.
//
// Business Rules phản ánh:
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ tạo view khi attempt SUBMITTED hoặc EXPIRED
//
// correctOptionIds lưu ở đây (khác với StudentAnswer domain entity):
//   Entity chỉ cần isCorrect + earnedPoints để chấm.
//   View cần correctOptionIds để render "đáp án đúng là gì" cho student.
//   Nguồn: event payload QuizAttemptSubmitted chứa correctOptionIds.
//
// Lưu ý naming: đây là 1 MongoDB document per attempt, không phải per question.
//   answers[] là embedded array bên trong document chính.
export interface StudentQuizAnswerView {
  // Document identity (MongoDB _id sẽ map vào attemptId)
  readonly attemptId: string;
  readonly quizId:    string;
  readonly studentId: string;
  readonly sectionId: string;

  // Summary (tránh phải query StudentQuizResultView thêm) 
  readonly totalScore:      number;
  readonly maxScore:        number;
  readonly submittedAt:     Date;
  readonly attemptNumber:   number;
  readonly status:          "SUBMITTED" | "EXPIRED";

  // Per-question answers (embedded array) 
  readonly answers: readonly StudentAnswerDetail[];
}

// Chi tiết từng câu trả lời — embedded trong StudentQuizAnswerView
export interface StudentAnswerDetail {
  // Question identity
  readonly questionId: string;

  // Denormalized content (copy từ Quiz Context qua event) 
  readonly questionContent: string;   // nội dung câu hỏi tại thời điểm làm bài

  // Student's answer
  readonly selectedOptionIds:       readonly string[]; // optionId student đã chọn
  readonly selectedOptionContents:  readonly string[]; // nội dung option đó

  // Correct answer (populate từ event payload)
  readonly correctOptionIds:        readonly string[]; // optionId đúng
  readonly correctOptionContents:   readonly string[]; // nội dung đáp án đúng

  // Grading 
  readonly isCorrect:     boolean; // true nếu selectedOptionIds == correctOptionIds
  readonly earnedPoints:  number;  // điểm đạt được cho câu này
  readonly questionPoints: number; // điểm tối đa của câu này (= pointsPerQuestion)
}