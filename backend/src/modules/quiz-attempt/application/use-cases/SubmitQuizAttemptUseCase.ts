import { IQuizAttemptRepository } from "../../domain/interface-repositories/IQuizAttemptRepository";
import { IQuizQueryService }       from "../../../quiz";
import { IDateTimeProvider }       from "../interfaces/IDateTimeProvider";
import { IEventPublisher }         from "../interfaces/IEventPublisher";
import { QuizAttempt }             from "../../domain/entities/QuizAttempt";
import { SubmitAttemptDTO }        from "../dtos/SubmitAttemptDTO";
import { validateSubmitAttempt }   from "../validators/QuizAttemptValidator";
import { QuizAttemptSubmitted }    from "../../domain/events/QuizAttemptSubmitted";
import {
  FinalizeAttemptResponseDTO,
  AnswerResultDTO,
} from "../dtos/AttemptResponseDTO";

// Flow:
//   1.  Validate format DTO
//   2.  Load attempt
//   3.  Check ownership
//   4.  Lấy QuizGradingData    — correctOptionIds, pointsPerQuestion
//   5.  Lấy QuizStudentViewData — questionContent, optionContent (để enrich event)
//   6.  Lấy QuizSnapshot        — quizTitle (để enrich event)
//   7.  Validate questionIds thuộc quiz
//   8.  Convert DTO → Map
//   9.  attempt.submit()
//  10.  save(attempt)
//  11.  Publish QuizAttemptSubmitted (enriched — self-contained cho Analytics)
//  12.  Trả về FinalizeAttemptResponseDTO
export class SubmitQuizAttemptUseCase {
  constructor(
    private readonly attemptRepository: IQuizAttemptRepository,
    private readonly quizQueryService:  IQuizQueryService,
    private readonly dateTimeProvider:  IDateTimeProvider,
    private readonly eventPublisher:    IEventPublisher,
  ) {}
 
  async execute(
    studentId: string,
    attemptId: string,
    dto:       SubmitAttemptDTO,
  ): Promise<FinalizeAttemptResponseDTO> {
    // Bước 1: Validate format DTO
    console.log('[SubmitQuizAttemptUseCase.execute] ENTRY');
    console.log(`[SubmitQuizAttemptUseCase.execute] studentId: ${studentId}`);
    console.log(`[SubmitQuizAttemptUseCase.execute] attemptId: ${attemptId}`);
    console.log(`[SubmitQuizAttemptUseCase.execute] Received DTO:`, JSON.stringify(dto, null, 2));
    console.log(`[SubmitQuizAttemptUseCase.execute] DTO.answers length: ${dto.answers?.length}`);
    if (dto.answers && dto.answers.length > 0) {
      console.log(`[SubmitQuizAttemptUseCase.execute] First answer:`, JSON.stringify(dto.answers[0], null, 2));
    }

    validateSubmitAttempt(dto);
 
    const now = this.dateTimeProvider.now();
 
    // Bước 2: Load attempt
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) {
      throw new Error(`NotFoundError: Attempt "${attemptId}" không tồn tại.`);
    }
 
    // Bước 3: Ownership check
    if (!attempt.isOwnedBy(studentId)) {
      throw new Error(
        `AccessDeniedError: Bạn không có quyền nộp bài cho attempt này.`
      );
    }
 
    // Bước 4: Lấy QuizGradingData — correctOptionIds, pointsPerQuestion, deadline, timeLimitMs
    const gradingData = await this.quizQueryService.getQuizGradingData(attempt.quizId);
    if (!gradingData) {
      throw new Error(
        `InternalError: Không thể lấy dữ liệu chấm điểm cho quiz "${attempt.quizId}".`
      );
    }
 
    // Bước 5: Lấy QuizStudentViewData — questionContent + optionContent để enrich event
    const quizView = await this.quizQueryService.getQuizQuestionsForStudent(attempt.quizId);
    if (!quizView) {
      throw new Error(
        `InternalError: Không thể lấy nội dung câu hỏi cho quiz "${attempt.quizId}".`
      );
    }
 
    // Bước 6: Lấy QuizSnapshot — quizTitle để enrich event
    const snapshot = await this.quizQueryService.getQuizSnapshot(attempt.quizId);
    if (!snapshot) {
      throw new Error(
        `InternalError: Không thể lấy thông tin quiz "${attempt.quizId}".`
      );
    }
 
    // Bước 7: Validate questionIds phải thuộc quiz
    const validQuestionIds = new Set(
      gradingData.questions.map((q) => q.questionId)
    );
    for (const item of dto.answers) {
      if (!validQuestionIds.has(item.questionId)) {
        throw new Error(
          `ValidationError: questionId "${item.questionId}" không thuộc quiz này.`
        );
      }
    }
 
    // Bước 8: Convert DTO → Map
    const submittedAnswers = new Map<string, string[]>(
      dto.answers.map((item) => [item.questionId, item.selectedOptionIds])
    );

    console.log(`[SubmitQuizAttemptUseCase.execute] submittedAnswers Map size: ${submittedAnswers.size}`);
    submittedAnswers.forEach((options, qId) => {
      console.log(`  QuestionId: ${qId}, SelectedOptionIds: [${options.join(', ')}]`);
    });
 
    // Bước 9: attempt.submit() — domain enforce deadline, timeLimit, gradeAndFinalize()
    console.log('[SubmitQuizAttemptUseCase.execute] Before submit - attempt.status:', attempt.status);
    attempt.submit({
      submittedAnswers,
      quizGradingData: {
        questions:         gradingData.questions,
        pointsPerQuestion: gradingData.pointsPerQuestion,
      },
      now,
      timeLimitMs: gradingData.timeLimitMs,
      deadline:    gradingData.deadlineAt,
    });
    console.log('[SubmitQuizAttemptUseCase.execute] After submit - attempt.status:', attempt.status);

    // Bước 10: Persist
    console.log('[SubmitQuizAttemptUseCase.execute] Before save - attempt:', { attemptId: attempt.attemptId, status: attempt.status, score: attempt.score.value });
    await this.attemptRepository.save(attempt);
    console.log('[SubmitQuizAttemptUseCase.execute] After save - attempt saved successfully');
 
    // Build lookup maps để enrich từng answer trong event
    // optionContentMap: optionId → content (dùng cho cả selected và correct)
    const optionContentMap = new Map<string, string>(
      quizView.questions.flatMap((q) =>
        q.options.map((o) => [o.optionId, o.content])
      )
    );
    // questionContentMap: questionId → content
    const questionContentMap = new Map<string, string>(
      quizView.questions.map((q) => [q.questionId, q.content])
    );
    // correctOptionIdsMap: questionId → correctOptionIds[]
    const correctOptionIdsMap = new Map<string, string[]>(
      gradingData.questions.map((q) => [q.questionId, q.correctOptionIds])
    );
 
    // Bước 11: Publish QuizAttemptSubmitted (enriched)
    const answers = [...attempt.answers];
    await this.eventPublisher.publish(
      new QuizAttemptSubmitted(
        attempt.attemptId,
        attempt.quizId,
        attempt.studentId,
        attempt.sectionId,
        attempt.attemptNumber.value,
        attempt.score.value,
        attempt.score.maxScore,
        snapshot.quizTitle,
        attempt.startedAt,
        gradingData.pointsPerQuestion,
        answers.map((a) => {
          const correctOptionIds  = correctOptionIdsMap.get(a.questionId) ?? [];
          const selectedOptionIds = [...a.selectedOptions.optionIds];
          return {
            questionId:             a.questionId,
            questionContent:        questionContentMap.get(a.questionId) ?? "",
            selectedOptionIds,
            selectedOptionContents: selectedOptionIds.map(
              (id) => optionContentMap.get(id) ?? ""
            ),
            correctOptionIds,
            correctOptionContents:  correctOptionIds.map(
              (id) => optionContentMap.get(id) ?? ""
            ),
            isCorrect:    a.isCorrect,
            earnedPoints: a.earnedPoints,
          };
        }),
        now,
      )
    );
 
    // Bước 12: Trả về response
    // correctOptionIds giờ được trả về thực sự thay vì []
    // Student xem đáp án đúng ngay từ HTTP response
    return buildFinalizeResponse(
      attempt,
      gradingData.pointsPerQuestion,
      correctOptionIdsMap,
      now,
    );
  }
}
 
// Shared helper 
// Dùng chung với ExpireQuizAttemptUseCase — cùng response shape.
//
// correctOptionIdsMap thêm vào so với version gốc:
//   Trả về correctOptionIds thực sự thay vì [] — student xem đáp án đúng
//   ngay sau submit mà không cần query Analytics Context thêm lần nữa.
export function buildFinalizeResponse(
  attempt:             QuizAttempt,
  pointsPerQuestion:   number,
  correctOptionIdsMap: Map<string, string[]>,
  now:                 Date,
): FinalizeAttemptResponseDTO {
  const answers      = [...attempt.answers];
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const duration     = attempt.duration;
 
  const answerResults: AnswerResultDTO[] = answers.map((a) => ({
    questionId:        a.questionId,
    selectedOptionIds: [...a.selectedOptions.optionIds],
    correctOptionIds:  correctOptionIdsMap.get(a.questionId) ?? [],
    isCorrect:         a.isCorrect,
    earnedPoints:      a.earnedPoints,
    questionPoints:    pointsPerQuestion,
  }));
 
  return {
    attemptId:       attempt.attemptId,
    quizId:          attempt.quizId,
    attemptNumber:   attempt.attemptNumber.value,
    status:          attempt.status,
    startedAt:       attempt.startedAt.toISOString(),
    submittedAt:     (attempt.submittedAt ?? now).toISOString(),
    durationSeconds: duration ? duration.seconds : 0,
    score:           attempt.score.value,
    maxScore:        attempt.score.maxScore,
    percentage:      Math.round(attempt.score.percentage * 10000) / 100,
    answers:         answerResults,
    totalQuestions:  answers.length,
    correctCount,
  };
}