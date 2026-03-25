import { IQuizAttemptRepository } from "../../domain/interface-repositories/IQuizAttemptRepository";
import { IQuizQueryService }       from "../../../quiz";
import { IDateTimeProvider }       from "../interfaces/IDateTimeProvider";
import { IEventPublisher }         from "../interfaces/IEventPublisher";
import { ExpireAttemptDTO }        from "../dtos/ExpireAttemptDTO";
import { validateExpireAttempt }   from "../validators/QuizAttemptValidator";
import { QuizAttemptExpired }      from "../../domain/events/QuizAttemptExpired";
import { FinalizeAttemptResponseDTO } from "../dtos/AttemptResponseDTO";
import { buildFinalizeResponse }   from "./SubmitQuizAttemptUseCase";

// Flow này xảy ra khi FRONTEND detect hết giờ và tự gọi expire endpoint.
// "Happy path" của expire — student vẫn được điểm cho những câu đã làm.
//
// Phân biệt với AttemptExpirationJob (background job fallback):
//   Job chỉ xử lý trường hợp frontend KHÔNG gửi được (mất mạng, đóng tab).
//   Job không biết student đã chọn gì → score = 0, answers = [].
//   UseCase này biết đầy đủ answers → chấm đúng.
//
// Idempotent design:
//   Nếu frontend gửi expire 2 lần (network retry), lần 2 attempt.expire()
//   return sớm vì status != InProgress (domain idempotent guard).
//   Use Case vẫn save() và trả về response bình thường — không throw.
//
// Flow:
//   1.  Validate format DTO
//   2.  Load attempt — check tồn tại
//   3.  Check ownership
//   4.  Lấy QuizGradingData
//   5.  Validate questionIds phải thuộc quiz
//   6.  Convert DTO → Map
//   7.  attempt.expire() — idempotent, không validate thời gian
//   8.  save(attempt)
//   9.  Publish QuizAttemptExpired (kèm score + answers đầy đủ)
//  10.  Trả về FinalizeAttemptResponseDTO
export class ExpireQuizAttemptUseCase {
  constructor(
    private readonly attemptRepository: IQuizAttemptRepository,
    private readonly quizQueryService:  IQuizQueryService,
    private readonly dateTimeProvider:  IDateTimeProvider,
    private readonly eventPublisher:    IEventPublisher,
  ) {}

  async execute(
    studentId: string,
    attemptId: string,
    dto:       ExpireAttemptDTO,
  ): Promise<FinalizeAttemptResponseDTO> {
    // Bước 1: Validate format DTO 
    validateExpireAttempt(dto);

    const now = this.dateTimeProvider.now();

    // Bước 2: Load attempt 
    const attempt = await this.attemptRepository.findById(attemptId);
    if (!attempt) {
      throw new Error(`NotFoundError: Attempt "${attemptId}" không tồn tại.`);
    }

    // Bước 3: Ownership check 
    if (!attempt.isOwnedBy(studentId)) {
      throw new Error(
        `AccessDeniedError: Bạn không có quyền expire attempt này.`
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
    // dto.answers có thể rỗng [] — student chưa chọn câu nào → score = 0
    const submittedAnswers = new Map<string, string[]>(
      dto.answers.map((item) => [item.questionId, item.selectedOptionIds])
    );

    // Bước 7: attempt.expire()
    // Idempotent: nếu attempt đã Expired/Submitted → domain return sớm, không throw
    // Không validate thời gian (khác với submit()) — đã biết là hết giờ
    attempt.expire({
      submittedAnswers,
      quizGradingData: {
        questions:         gradingData.questions,
        pointsPerQuestion: gradingData.pointsPerQuestion,
      },
      now,
    });

    // Bước 8: Persist 
    await this.attemptRepository.save(attempt);

    // Bước 9: Publish QuizAttemptExpired 
    // Cần kèm score + answers đầy đủ để Analytics populate:
    //   - StudentQuizResultView (score, duration, attemptNumber)
    //   - QuestionFailureRateView (answers + isCorrect)
    //   - QuizPerformanceView (totalAttempts — đếm cả Expired)
    // Tương tự pattern của QuizAttemptSubmitted — subscriber không cần query DB.
    //
    // NOTE: Analytics phân biệt Submitted vs Expired để tính completionRate:
    //   completionRate = Submitted / totalStudents (không tính Expired)
    const answers = [...attempt.answers];
    await this.eventPublisher.publish(
      new QuizAttemptExpired(
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