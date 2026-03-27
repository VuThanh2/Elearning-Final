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
//   Job chỉ xử lý khi frontend KHÔNG gửi được (mất mạng, đóng tab).
//   Job không biết student đã chọn gì → answers = [] → score = 0.
//   UseCase này có đầy đủ answers → chấm đúng.
//
// Idempotent:
//   Frontend có thể gửi expire 2 lần (network retry). Lần 2:
//   attempt.expire() return sớm (status != InProgress, domain guard).
//   Use Case vẫn save() và trả về response bình thường.
//
// Flow:
//   1.  Validate format DTO
//   2.  Load attempt
//   3.  Check ownership
//   4.  Lấy QuizGradingData    — correctOptionIds, pointsPerQuestion
//   5.  Lấy QuizStudentViewData — questionContent, optionContent (enrich event)
//   6.  Lấy QuizSnapshot        — quizTitle (enrich event)
//   7.  Validate questionIds thuộc quiz
//   8.  Convert DTO → Map
//   9.  attempt.expire() — idempotent, không validate thời gian
//  10.  save(attempt)
//  11.  Publish QuizAttemptExpired (enriched — self-contained cho Analytics)
//  12.  Trả về FinalizeAttemptResponseDTO
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
    // dto.answers có thể rỗng [] — student chưa chọn câu nào → hợp lệ (score = 0)
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
 
    // Bước 9: attempt.expire()
    // Idempotent: nếu đã Expired/Submitted → domain return sớm, không throw
    // Không validate deadline/timeLimit — đã biết là hết giờ
    attempt.expire({
      submittedAnswers,
      quizGradingData: {
        questions:         gradingData.questions,
        pointsPerQuestion: gradingData.pointsPerQuestion,
      },
      now,
    });
 
    // Bước 10: Persist
    await this.attemptRepository.save(attempt);
 
    // Build lookup maps — giống SubmitQuizAttemptUseCase
    const optionContentMap = new Map<string, string>(
      quizView.questions.flatMap((q) =>
        q.options.map((o) => [o.optionId, o.content])
      )
    );
    const questionContentMap = new Map<string, string>(
      quizView.questions.map((q) => [q.questionId, q.content])
    );
    const correctOptionIdsMap = new Map<string, string[]>(
      gradingData.questions.map((q) => [q.questionId, q.correctOptionIds])
    );
 
    // Bước 11: Publish QuizAttemptExpired (enriched)
    // Analytics phân biệt Expired vs Submitted:
    //   completionRate = Submitted / totalStudents (không tính Expired)
    //   totalAttempts tính cả Expired
    //   StudentQuizAnswerView lưu cả Expired — student vẫn xem được bài
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
    return buildFinalizeResponse(
      attempt,
      gradingData.pointsPerQuestion,
      correctOptionIdsMap,
      now,
    );
  }
}