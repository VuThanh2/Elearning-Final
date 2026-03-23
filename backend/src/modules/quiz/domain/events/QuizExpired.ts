export class QuizExpired {
  readonly occurredAt: Date;

  constructor(
    readonly quizId: string,
    readonly sectionId: string,
  ) {
    this.occurredAt = new Date();
  }
}