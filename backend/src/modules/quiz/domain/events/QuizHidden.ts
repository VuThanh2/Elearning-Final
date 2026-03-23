export class QuizHidden {
  readonly occurredAt: Date;

  constructor(
    readonly quizId: string,
    readonly teacherId: string,
    readonly sectionId: string,
    // null nếu Teacher không nhập lý do
    readonly reason: string | null,
  ) {
    this.occurredAt = new Date();
  }
}