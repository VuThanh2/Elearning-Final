import { IQuizAttemptRepository }  from "../../domain/interface-repositories/IQuizAttemptRepository";
import { IAcademicQueryService }    from "../../../academic";
import { IQuizQueryService }        from "../../../quiz";
import { IDateTimeProvider }        from "../interfaces/IDateTimeProvider";
import { IEventPublisher }          from "../interfaces/IEventPublisher";
import { QuizAttempt }              from "../../domain/entities/QuizAttempt";
import { AttemptNumber }            from "../../domain/value-objects/AttemptNumber";
import { QuizAttemptStarted }       from "../../domain/events/QuizAttemptStarted";
import {
  StartAttemptResponseDTO,
  AttemptQuestionDTO,
  AttemptOptionDTO,
} from "../dtos/AttemptResponseDTO";

// Flow:
//   1.  getQuizSnapshot()              — check tồn tại, status, deadline
//   2.  isStudentEnrolledInSection()   — check enrollment
//   3.  countByStudentAndQuiz()        — check maxAttempts
//   4.  QuizAttempt.create()           — tạo entity InProgress
//   5.  Tính expiresAt
//   6.  saveNewAttempt(attempt, expiresAt)
//   7.  Publish QuizAttemptStarted
//   8.  getQuizQuestionsForStudent()   — lấy questions để render (không có isCorrect)
//   9.  Trả về StartAttemptResponseDTO
export class StartQuizAttemptUseCase {
  constructor(
    private readonly attemptRepository: IQuizAttemptRepository,
    private readonly academicService:   IAcademicQueryService,
    private readonly quizQueryService:  IQuizQueryService,
    private readonly dateTimeProvider:  IDateTimeProvider,
    private readonly eventPublisher:    IEventPublisher,
  ) {}

  async execute(
    studentId: string,
    quizId:    string,
  ): Promise<StartAttemptResponseDTO> {
    const now = this.dateTimeProvider.now();

    // Bước 1: Quiz tồn tại và đang Published 
    const snapshot = await this.quizQueryService.getQuizSnapshot(quizId);
    if (!snapshot) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    if (snapshot.status !== "Published") {
      throw new Error(
        `QuizClosedError: Quiz "${quizId}" không khả dụng (status: ${snapshot.status}).`
      );
    }

    // Dùng >= để đúng với rule "Attempt Cannot Start After Deadline"
    // (đúng hạn tới millisecond cũng không được start)
    if (now >= snapshot.deadlineAt) {
      throw new Error(
        `QuizClosedError: Quiz "${quizId}" đã quá hạn nộp bài.`
      );
    }

    // Bước 2: Student enrolled vào section của quiz
    const isEnrolled = await this.academicService.isStudentEnrolledInSection(
      studentId,
      snapshot.sectionId,
    );
    if (!isEnrolled) {
      throw new Error(
        `NotEnrolledError: Bạn không thuộc section của quiz này.`
      );
    }

    // Bước 3: Student chưa vượt maxAttempts 
    const attemptCount = await this.attemptRepository.countByStudentAndQuiz(
      studentId,
      quizId,
    );
    if (attemptCount >= snapshot.maxAttempts) {
      throw new Error(
        `MaxAttemptsReachedError: Bạn đã dùng hết ${snapshot.maxAttempts} lần làm bài.`
      );
    }

    // Bước 4: Tạo QuizAttempt entity
    const attempt = QuizAttempt.create({
      quizId,
      studentId,
      sectionId:     snapshot.sectionId,
      attemptNumber: AttemptNumber.create(attemptCount + 1),
      maxScore:      snapshot.maxScore,
      now,
    });

    // Bước 5: Tính expiresAt
    const timeLimitMs = snapshot.timeLimitMinutes * 60_000;
    const expiresAt   = new Date(now.getTime() + timeLimitMs);

    // Bước 6: Persist 
    await this.attemptRepository.saveNewAttempt(attempt, expiresAt);

    // Bước 7: Publish event
    await this.eventPublisher.publish(
      new QuizAttemptStarted(
        attempt.attemptId,
        quizId,
        studentId,
        snapshot.sectionId,
        attempt.attemptNumber.value,
        now,
      )
    );

    // Bước 8: Lấy questions để render bài làm 
    // getQuizQuestionsForStudent() trả về questions với content + options
    // nhưng KHÔNG có isCorrect — Quiz Context đã strip trước khi expose.
    const studentViewData = await this.quizQueryService.getQuizQuestionsForStudent(quizId);

    // Guard: không thể null vì quiz đã pass bước 1 (snapshot tồn tại, status Published)
    // và PublishQuizUseCase enforce ít nhất 1 question trước khi publish.
    // Nếu null thì là lỗi data inconsistency — throw InternalError.
    if (!studentViewData) {
      throw new Error(
        `InternalError: Không thể lấy câu hỏi cho quiz "${quizId}".`
      );
    }

    // Bước 9: Build response
    const questions: AttemptQuestionDTO[] = studentViewData.questions.map((q) => ({
      questionId:   q.questionId,
      content:      q.content,
      questionType: q.questionType,
      options:      q.options.map((opt): AttemptOptionDTO => ({
        optionId: opt.optionId,
        content:  opt.content,
      })),
      points: studentViewData.pointsPerQuestion,
    }));

    return {
      attemptId:        attempt.attemptId,
      quizId,
      attemptNumber:    attempt.attemptNumber.value,
      status:           attempt.status,
      startedAt:        attempt.startedAt.toISOString(),
      expiresAt:        expiresAt.toISOString(),
      timeLimitMinutes: snapshot.timeLimitMinutes,
      questions,
      totalQuestions:   snapshot.totalQuestions,
      maxScore:         snapshot.maxScore,
    };
  }
}