// Phát ra khi student bắt đầu 1 attempt mới.
// Analytics có thể dùng để đếm totalAttempts.
export class QuizAttemptStarted {
  readonly occurredAt: Date;

  constructor(
    readonly attemptId: string,
    readonly quizId: string,
    readonly studentId: string,
    readonly sectionId: string,
    readonly attemptNumber: number,
    occurredAt: Date,
  ) {
    this.occurredAt = occurredAt;
  }
}