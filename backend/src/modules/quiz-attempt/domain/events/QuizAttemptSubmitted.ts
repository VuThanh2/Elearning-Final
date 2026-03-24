// Phát ra khi student nộp bài thành công.
//
// Analytics Context dùng để:
//   - Cập nhật QuizPerformanceView (averageScore, completionRate)
//   - Cập nhật StudentQuizResultView
//   - Cập nhật StudentClassRankingView
//   - Cập nhật QuestionFailureRateView
//   - Cập nhật AtRiskStudentView
//   - Cập nhật ScoreDistributionView
//
// Identity Context dùng để:
//   - Cập nhật StudentProfile.completedQuizAttempts
//   - Cập nhật StudentProfile.averageScore
//
// Chứa đủ data để subscriber không cần query lại write DB.

export class QuizAttemptSubmitted {
  readonly occurredAt: Date;

  constructor(
    readonly attemptId: string,
    readonly quizId: string,
    readonly studentId: string,
    readonly sectionId: string,
    readonly attemptNumber: number,
    readonly score: number,
    readonly maxScore: number,
    readonly answers: Array<{
      questionId: string;
      selectedOptionIds: string[];
      isCorrect: boolean;
      earnedPoints: number;
    }>,
    occurredAt: Date,
  ) {
    this.occurredAt = occurredAt;
  }
}