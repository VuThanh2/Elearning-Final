// Phát ra khi attempt hết giờ.
//
// Có 2 nguồn phát event này:
//   1. ExpireAttemptUseCase  — frontend detect hết giờ, gửi answers lên server
//      → student vẫn được điểm cho những câu đã làm
//   2. AttemptExpirationJob  — fallback khi frontend không gửi được (mất mạng)
//      → score = 0 vì server không biết student đã chọn gì
//
// Analytics Context dùng để:
//   - Cập nhật StudentQuizResultView (score, duration, attemptNumber)
//   - Cập nhật QuizPerformanceView (totalAttempts — đếm cả Expired)
//   - Cập nhật QuestionFailureRateView (answers)
//   - Phân biệt Expired vs Submitted trong completionRate
//     (completionRate chỉ tính Submitted, không tính Expired)
//
// Identity Context dùng để:
//   - Cập nhật StudentProfile.completedQuizAttempts (đếm cả Expired)
export class QuizAttemptExpired {
  readonly occurredAt: Date;

  constructor(
    readonly attemptId:     string,
    readonly quizId:        string,
    readonly studentId:     string,
    readonly sectionId:     string,
    readonly attemptNumber: number,
    readonly score:    number,
    readonly maxScore: number,
    readonly quizTitle: string,
    readonly startedAt: Date,
    readonly pointsPerQuestion: number,
    readonly answers: ReadonlyArray<{
      readonly questionId:             string;
      readonly questionContent:        string;
      readonly selectedOptionIds:      ReadonlyArray<string>;
      readonly selectedOptionContents: ReadonlyArray<string>;
      readonly correctOptionIds:       ReadonlyArray<string>;
      readonly correctOptionContents:  ReadonlyArray<string>;
      readonly isCorrect:   boolean;
      readonly earnedPoints: number;
    }>,
    occurredAt: Date,
  ) {
    this.occurredAt = occurredAt;
  }
}