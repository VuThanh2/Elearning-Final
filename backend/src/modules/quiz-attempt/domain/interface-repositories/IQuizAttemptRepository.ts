import { QuizAttempt } from "../entities/QuizAttempt";

// Implementation sẽ dùng MongoDB — 1 attempt = 1 document (nested answers).

export interface IQuizAttemptRepository {
  // Tìm attempt theo attemptId — dùng khi submit hoặc xem kết quả
  findById(attemptId: string): Promise<QuizAttempt | null>;

  // Đếm số attempt của student cho 1 quiz — dùng để check maxAttempts
  // trước khi tạo attempt mới
  countByStudentAndQuiz(
    studentId: string,
    quizId: string,
  ): Promise<number>;

  // Persist attempt (insert hoặc update)
  save(attempt: QuizAttempt): Promise<void>;

  // Tìm tất cả attempt đang InProgress đã quá thời gian —
  // dùng cho background job expire
  findExpiredCandidates(now: Date): Promise<QuizAttempt[]>;
}