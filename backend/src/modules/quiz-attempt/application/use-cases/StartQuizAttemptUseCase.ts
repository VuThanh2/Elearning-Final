import { IQuizAttemptRepository } from "../../domain/interface-repositories/IQuizAttemptRepository";
import { IAcademicQueryService } from "../../../academic";
import { IQuizQueryService } from "../../../quiz";
import { IDateTimeProvider } from "../interfaces/IDateTimeProvider";
import { IEventPublisher } from "../interfaces/IEventPublisher";
import { QuizAttempt } from "../../domain/entities/QuizAttempt";
import { AttemptNumber } from "../../domain/value-objects/AttemptNumber";
import { QuizAttemptStarted } from "../../domain/events/QuizAttemptStarted";
import {
  StartAttemptResponseDTO,
  AttemptQuestionDTO,
  AttemptOptionDTO,
} from "../dtos/AttemptResponseDTO";

export class StartQuizAttemptUseCase {
  constructor(
    private readonly attemptRepository: IQuizAttemptRepository,
    private readonly academicService: IAcademicQueryService,
    private readonly quizQueryService: IQuizQueryService,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly eventPublisher: IEventPublisher,
  ) {}

  async execute(studentId: string, quizId: string): Promise<StartAttemptResponseDTO> {
    const now = this.dateTimeProvider.now();
    const traceId = `${quizId}:${studentId}:${now.getTime()}`;
    const mark = (label: string, extra?: unknown) => {
      if (extra === undefined) {
        console.log(`[StartQuizAttemptUseCase][${traceId}] ${label}`);
      } else {
        console.log(`[StartQuizAttemptUseCase][${traceId}] ${label}`, extra);
      }
    };

    mark('ENTRY');

    mark('STEP 1 getQuizSnapshot:start');
    const snapshot = await this.quizQueryService.getQuizSnapshot(quizId);
    mark('STEP 1 getQuizSnapshot:end', snapshot ? { status: snapshot.status, maxAttempts: snapshot.maxAttempts, deadlineAt: snapshot.deadlineAt } : 'NULL');
    if (!snapshot) throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    if (snapshot.status !== 'Published') throw new Error(`QuizClosedError: Quiz "${quizId}" không khả dụng (status: ${snapshot.status}).`);
    if (now >= snapshot.deadlineAt) throw new Error(`QuizClosedError: Quiz "${quizId}" đã quá hạn nộp bài.`);

    mark('STEP 2 isStudentEnrolledInSection:start', { studentId, sectionId: snapshot.sectionId });
    const isEnrolled = await this.academicService.isStudentEnrolledInSection(studentId, snapshot.sectionId);
    mark('STEP 2 isStudentEnrolledInSection:end', { isEnrolled });
    if (!isEnrolled) throw new Error(`NotEnrolledError: Bạn không thuộc section của quiz này.`);

    mark('STEP 3 findInProgressByStudentAndQuiz:start');
    const existingInProgress = await this.attemptRepository.findInProgressByStudentAndQuiz(studentId, quizId);
    mark('STEP 3 findInProgressByStudentAndQuiz:end', existingInProgress ? { attemptId: existingInProgress.attemptId, status: existingInProgress.status } : 'NULL');
    if (existingInProgress) {
      mark('STEP 3 reusing existing attempt', { attemptId: existingInProgress.attemptId });
      const existingExpiresAt = new Date(existingInProgress.startedAt.getTime() + snapshot.timeLimitMinutes * 60_000);
      return this.buildStartAttemptResponse(existingInProgress, snapshot, existingExpiresAt);
    }

    mark('STEP 4 countByStudentAndQuiz:start');
    const attemptCount = await this.attemptRepository.countByStudentAndQuiz(studentId, quizId);
    mark('STEP 4 countByStudentAndQuiz:end', { attemptCount, maxAttempts: snapshot.maxAttempts });
    if (attemptCount >= snapshot.maxAttempts) {
      throw new Error(`MaxAttemptsReachedError: Bạn đã dùng hết ${snapshot.maxAttempts} lần làm bài. (Attempts: ${attemptCount}/${snapshot.maxAttempts})`);
    }

    const attempt = QuizAttempt.create({
      quizId,
      studentId,
      sectionId: snapshot.sectionId,
      attemptNumber: AttemptNumber.create(attemptCount + 1),
      maxScore: snapshot.maxScore,
      now,
    });

    const timeLimitMs = snapshot.timeLimitMinutes * 60_000;
    const expiresAt = new Date(now.getTime() + timeLimitMs);

    mark('STEP 5 saveNewAttempt:start', { attemptId: attempt.attemptId });
    await this.attemptRepository.saveNewAttempt(attempt, expiresAt);
    mark('STEP 5 saveNewAttempt:end');

    mark('STEP 6 countInProgressByStudentAndQuiz:start');
    const allInProgress = await this.attemptRepository.countInProgressByStudentAndQuiz(studentId, quizId);
    mark('STEP 6 countInProgressByStudentAndQuiz:end', { allInProgress });
    if (allInProgress > 1) {
      console.error(`[StartQuizAttemptUseCase][${traceId}] RACE CONDITION DETECTED! Multiple InProgress attempts found:`, { studentId, quizId, count: allInProgress });
      await this.attemptRepository.deleteOlderInProgressAttempts(studentId, quizId, attempt.attemptId);
    }

    mark('STEP 7 publish event:start');
    await this.eventPublisher.publish(new QuizAttemptStarted(attempt.attemptId, quizId, studentId, snapshot.sectionId, attempt.attemptNumber.value, now));
    mark('STEP 7 publish event:end');

    mark('STEP 8 buildStartAttemptResponse:start');
    const response = await this.buildStartAttemptResponse(attempt, snapshot, expiresAt);
    mark('STEP 8 buildStartAttemptResponse:end', { questionCount: response.questions.length });
    return response;
  }

  private async buildStartAttemptResponse(
    attempt: QuizAttempt,
    snapshot: { sectionId: string; timeLimitMinutes: number; totalQuestions: number; maxScore: number },
    expiresAt: Date,
  ): Promise<StartAttemptResponseDTO> {
    console.log('[StartQuizAttemptUseCase.buildStartAttemptResponse] Fetching student view questions for quiz:', attempt.quizId);
    const studentViewData = await this.quizQueryService.getQuizQuestionsForStudent(attempt.quizId);
    console.log('[StartQuizAttemptUseCase.buildStartAttemptResponse] Student view loaded:', studentViewData ? { questionCount: studentViewData.questions.length, pointsPerQuestion: studentViewData.pointsPerQuestion } : 'NULL');
    if (!studentViewData) {
      throw new Error(`InternalError: Không thể lấy câu hỏi cho quiz "${attempt.quizId}".`);
    }

    const questions: AttemptQuestionDTO[] = studentViewData.questions.map((q) => ({
      questionId: q.questionId,
      id: q.questionId,
      content: q.content,
      questionType: q.questionType,
      options: q.options.map((opt): AttemptOptionDTO => ({
        optionId: opt.optionId,
        id: opt.optionId,
        content: opt.content,
      })),
      answerOptions: q.options.map((opt): AttemptOptionDTO => ({
        optionId: opt.optionId,
        id: opt.optionId,
        content: opt.content,
      })),
      points: studentViewData.pointsPerQuestion,
    }));

    console.log('[StartQuizAttemptUseCase.buildStartAttemptResponse] Returning payload:', {
      attemptId: attempt.attemptId,
      quizId: attempt.quizId,
      questionCount: questions.length,
      totalQuestions: snapshot.totalQuestions,
      maxScore: snapshot.maxScore,
    });

    return {
      attemptId: attempt.attemptId,
      quizId: attempt.quizId,
      quizTitle: studentViewData.quizTitle ?? 'Quiz Attempt',
      description: studentViewData.description ?? '',
      attemptNumber: attempt.attemptNumber.value,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      timeLimitMinutes: snapshot.timeLimitMinutes,
      questions,
      totalQuestions: snapshot.totalQuestions,
      maxScore: snapshot.maxScore,
    };
  }
}
