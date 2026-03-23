export class QuizPublished {
  readonly occurredAt: Date;

  constructor(
    readonly quizId: string,
    readonly teacherId: string,
    readonly sectionId: string,
  ) {
    this.occurredAt = new Date();
  }
}