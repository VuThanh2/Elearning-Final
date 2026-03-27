// Actor: Student
// Purpose: Sinh viên xem lại kết quả quiz của chính mình.
//          Liệt kê tất cả attempt của student theo từng quiz.
//
// Được populate từ event: QuizAttemptSubmitted / QuizAttemptExpired
// Storage: Oracle — dữ liệu dạng bảng phẳng, cần filter/sort/paging.
//
// Business Rules phản ánh:
//   - Rule: Analytics Must Be Based On Submitted Attempts
//     → chỉ attempt SUBMITTED hoặc EXPIRED, không hiển thị IN_PROGRESS
//
// duration: submittedAt - startedAt, lưu dưới dạng giây (seconds)
//   để tiện format ở presentation layer (mm:ss, "20 phút", ...)
//
// percentage: score / maxScore, lưu sẵn dưới dạng 0–1
//   (ví dụ: 0.95 = 95%)
// attemptNumber: thứ tự attempt của student với quiz này (1, 2, 3, ...)
//   Dùng để student phân biệt "lần 1", "lần 2" khi xem lịch sử.
export interface StudentQuizResultView {
  // Identity 
  readonly attemptId: string;
  readonly quizId:    string;
  readonly studentId: string;
  readonly sectionId: string;

  // Denormalized label
  readonly quizTitle: string;

  // Score
  readonly score:      number; // điểm đạt được
  readonly maxScore:   number; // điểm tối đa của quiz
  readonly percentage: number; // score / maxScore, 0–1

  // Timing 
  readonly startedAt:       Date;   // thời điểm bắt đầu attempt
  readonly submittedAt:     Date;   // thời điểm nộp bài (submit hoặc expire)
  readonly durationSeconds: number; // submittedAt - startedAt, tính bằng giây

  // Attempt info 
  readonly attemptNumber: number;  // thứ tự attempt (bắt đầu từ 1)
  readonly status:        StudentQuizResultStatus; // trạng thái cuối của attempt
}

// Chỉ 2 trạng thái có trong read model — IN_PROGRESS không được lưu vào projection
export type StudentQuizResultStatus = "SUBMITTED" | "EXPIRED";