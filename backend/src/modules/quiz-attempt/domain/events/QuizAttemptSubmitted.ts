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
 
      // Student's choices
      readonly selectedOptionIds:      ReadonlyArray<string>;
      readonly selectedOptionContents: ReadonlyArray<string>; // content của option student chọn
 
      // Correct answer
      readonly correctOptionIds:       ReadonlyArray<string>;
      readonly correctOptionContents:  ReadonlyArray<string>; // content của đáp án đúng
 
      // Grading result
      readonly isCorrect:   boolean;
      readonly earnedPoints: number;
    }>,
    occurredAt: Date,
  ) {
    this.occurredAt = occurredAt;
  }
}