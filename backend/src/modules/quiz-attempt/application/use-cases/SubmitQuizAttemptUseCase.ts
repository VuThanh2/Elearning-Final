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
//   2.  Load attempt — check tồn tại
//   3.  Check ownership (Rule: Attempt Must Belong to a Student)
//   4.  Lấy QuizGradingData từ Quiz Context
//   5.  Validate questionIds phải thuộc quiz (Rule: Answer Must Belong to the Attempt Quiz)
//   6.  Convert DTO → Map<questionId, selectedOptionIds[]>
//   7.  attempt.submit() — domain enforce:
//         - assertInProgress() (Cannot Answer After Submission/Expired)
//         - deadline chưa qua
//         - timeLimit chưa vượt
//         - gradeAndFinalize()
//   8.  save(attempt)
//   9.  Publish QuizAttemptSubmitted
//  10.  Trả về FinalizeAttemptResponseDTO
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

    // Bước 4: Lấy QuizGradingData 
    const gradingData = await this.quizQueryService.getQuizGradingData(
      attempt.quizId
    );
    if (!gradingData) {
      throw new Error(
        `InternalError: Không thể lấy dữ liệu chấm điểm cho quiz "${attempt.quizId}".`
      );
    }

    // Bước 5: Validate questionIds phải thuộc quiz 
    // (Rule: Answer Must Belong to the Attempt Quiz)
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

    // Bước 6: Convert DTO → Map 
    const submittedAnswers = new Map<string, string[]>(
      dto.answers.map((item) => [item.questionId, item.selectedOptionIds])
    );

    // Bước 7: attempt.submit() 
    // Domain enforce: assertInProgress(), deadline, timeLimit, gradeAndFinalize()
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

    // Bước 8: Persist
    await this.attemptRepository.save(attempt);

    // Bước 9: Publish QuizAttemptSubmitted
    // Chứa đầy đủ answers + score để Analytics/Identity không phải query lại DB
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
        answers.map((a) => ({
          questionId:        a.questionId,
          selectedOptionIds: [...a.selectedOptions.optionIds],
          isCorrect:         a.isCorrect,
          earnedPoints:      a.earnedPoints,
        })),
        now,
      )
    );

    // Bước 10: Trả về 
    return buildFinalizeResponse(attempt, gradingData.pointsPerQuestion, now);
  }
}

// Shared helper — dùng chung với ExpireAttemptUseCase 
//
// Tách ra function riêng vì Submit và Expire có cùng response shape.
export function buildFinalizeResponse(
  attempt:           QuizAttempt,
  pointsPerQuestion: number,
  now:               Date,
): FinalizeAttemptResponseDTO {
  const answers      = [...attempt.answers];
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const duration     = attempt.duration;

  const answerResults: AnswerResultDTO[] = answers.map((a) => ({
    questionId:        a.questionId,
    selectedOptionIds: [...a.selectedOptions.optionIds],
    // correctOptionIds không lưu trong StudentAnswer entity vì entity chỉ
    // cần isCorrect + earnedPoints để chấm điểm. Để student xem đáp án đúng
    // sau khi nộp → query Analytics Context (StudentQuizAnswerView).
    // StudentQuizAnswerView được populate từ event payload (có correctOptionIds).
    correctOptionIds:  [],
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