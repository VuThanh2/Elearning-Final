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

  // Tìm attempt InProgress cho student+quiz — dùng để prevent multiple active attempts
  findInProgressByStudentAndQuiz(
    studentId: string,
    quizId: string,
  ): Promise<QuizAttempt | null>;

  // Persist attempt mới kèm expiresAt — chỉ dùng khi start attempt.
  // expiresAt = startedAt + timeLimitMs, được tính bởi StartAttemptUseCase.
  // Không dùng cho submit/expire vì expiresAt lúc đó đã có sẵn trong DB.
  saveNewAttempt(attempt: QuizAttempt, expiresAt: Date): Promise<void>;

  // Persist attempt đã tồn tại (submit hoặc expire).
  // Implementation tự giữ nguyên expiresAt từ document cũ.
  save(attempt: QuizAttempt): Promise<void>;

  // Tìm tất cả attempt đang InProgress đã quá thời gian —
  // dùng cho background job expire
  findExpiredCandidates(now: Date): Promise<QuizAttempt[]>;
}