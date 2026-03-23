export class QuizCreated {
  readonly occurredAt: Date;

  constructor(
    readonly quizId: string,
    readonly teacherId: string,
    readonly sectionId: string,
    readonly title: string,
  ) {
    this.occurredAt = new Date();
  }
}