import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { PublishedQuizSummaryDTO } from "../dtos/QuizResponseDTO";
import { QuizMapper } from "../../infrastructure/mappers/QuizMapper";

export interface QuizAttemptAvailabilityReader {
  countByStudentAndQuiz(studentId: string, quizId: string): Promise<number>;
}

// Actor: Student (or Teacher preview)
// Returns published quizzes with per-student attempt availability.
export class GetPublishedQuizListUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly attemptReader?: QuizAttemptAvailabilityReader,
  ) {}

  async execute(
    studentIdOrSectionId: string,
    maybeSectionId?: string,
  ): Promise<PublishedQuizSummaryDTO[]> {
    const studentId = maybeSectionId ? studentIdOrSectionId : null;
    const sectionId = maybeSectionId ?? studentIdOrSectionId;
    const quizzes = await this.quizRepository.findPublishedBySection(sectionId);

    const summaries = await Promise.all(
      quizzes.map(async (quiz) => {
        const attemptsUsed = studentId && this.attemptReader
          ? await this.attemptReader.countByStudentAndQuiz(studentId, quiz.quizId)
          : 0;
        const attemptsRemaining = Math.max(quiz.maxAttempts.value - attemptsUsed, 0);
        const canStart = attemptsRemaining > 0 && quiz.deadline.value > new Date();

        return QuizMapper.toPublishedSummaryDTO(quiz, {
          attemptsUsed,
          attemptsRemaining,
          canStart,
        });
      }),
    );

    return summaries.sort((a, b) =>
      new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime()
    );
  }
}
