// Phát ra khi system tự đóng attempt do hết thời gian.
// Analytics có thể dùng để phân biệt completed vs expired.
export class QuizAttemptExpired {
  readonly occurredAt: Date;

  constructor(
    readonly attemptId: string,
    readonly quizId: string,
    readonly studentId: string,
    readonly sectionId: string,
    occurredAt: Date,
  ) {
    this.occurredAt = occurredAt;
  }
}