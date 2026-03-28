import { IMongoAnalyticsRepository }                       from "../../domain/interface-repositories/IMongoAnalyticsRepository";
import { StudentQuizAnswerView, StudentAnswerDetail }      from "../../domain/read-models/StudentQuizAnswerView";
import { StudentQuizAnswerReviewDTO, AnswerReviewItemDTO } from "../dtos/StudentQuizAnswerDTO";

// Actor:   Student
// Permission: VIEW_OWN_RESULT
export class StudentQuizAnswerQuery {
  constructor(
    private readonly mongoRepo: IMongoAnalyticsRepository,
  ) {}

  // GET /analytics/attempts/:attemptId/answer-review
  // → StudentQuizAnswerReviewDTO | null
  // null = projection chưa populate (eventually consistent).
  async byAttempt(
    studentId: string,
    attemptId: string,
  ): Promise<StudentQuizAnswerReviewDTO | null> {
    const view = await this.mongoRepo.findAnswerViewByAttempt(attemptId);
    if (!view) return null;

    // Ownership check: query theo attemptId — bất kỳ ai cũng có thể đoán.
    // studentId trong document phải khớp với actor từ JWT.
    if (view.studentId !== studentId) {
      throw new Error(
        `AccessDeniedError: Bạn không có quyền xem review của attempt "${attemptId}".`,
      );
    }

    return this.toDTO(view);
  }

  // GET /analytics/quizzes/:quizId/my-answer-history
  // → StudentQuizAnswerReviewDTO[]   (attemptNumber ASC — Repository đã ORDER BY)
  async byQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizAnswerReviewDTO[]> {
    // Compound query (studentId, quizId) đảm bảo ownership — không cần check thêm.
    const views = await this.mongoRepo.findAnswerViewsByStudentAndQuiz(studentId, quizId);
    return views.map((view) => this.toDTO(view));
  }

  // private helpers 
  // StudentQuizAnswerView (domain) → StudentQuizAnswerReviewDTO (application)
  private toDTO(view: StudentQuizAnswerView): StudentQuizAnswerReviewDTO {
    return {
      attemptId:     view.attemptId,
      quizId:        view.quizId,
      sectionId:     view.sectionId,
      totalScore:    view.totalScore,
      maxScore:      view.maxScore,
      percentage:    view.totalScore / view.maxScore,
      submittedAt:   view.submittedAt.toISOString(),
      attemptNumber: view.attemptNumber,
      status:        view.status,
      answers:       view.answers.map((a) => this.toAnswerItemDTO(a)),
    };
  }

  private toAnswerItemDTO(a: StudentAnswerDetail): AnswerReviewItemDTO {
    return {
      questionId:             a.questionId,
      questionContent:        a.questionContent,
      selectedOptionIds:      [...a.selectedOptionIds],
      selectedOptionContents: [...a.selectedOptionContents],
      correctOptionIds:       [...a.correctOptionIds],
      correctOptionContents:  [...a.correctOptionContents],
      isCorrect:              a.isCorrect,
      earnedPoints:           a.earnedPoints,
      questionPoints:         a.questionPoints,
    };
  }
}