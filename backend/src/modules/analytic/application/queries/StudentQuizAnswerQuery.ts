import { IMongoAnalyticsRepository }                       from "../../domain/interface-repositories/IMongoAnalyticsRepository";
import { StudentQuizAnswerView, StudentAnswerDetail }      from "../../domain/read-models/StudentQuizAnswerView";
import { StudentQuizAnswerDTO, AnswerItemDTO } from "../dtos/StudentQuizAnswerDTO";
import { IAnalyticCache, AnalyticCacheKey, AnalyticsCacheTTL } from "../../domain/interface-repositories/IAnalyticCache";

// Actor:   Student
// Permission: VIEW_OWN_RESULT
export class StudentQuizAnswerQuery {
  constructor(
    private readonly mongoRepo: IMongoAnalyticsRepository,
    private readonly cache:     IAnalyticCache,
  ) {}

  // GET /analytics/attempts/:attemptId/answer-review
  // → StudentQuizAnswerDTO | null
  // null = projection chưa populate (eventually consistent).
  async byAttempt(
    studentId: string,
    attemptId: string,
  ): Promise<StudentQuizAnswerDTO | null> {
    const key    = AnalyticCacheKey.answerReview(attemptId);
    const cached = await this.cache.get<StudentQuizAnswerDTO>(key);
    if (cached) return cached;

    // Cache MISS: fetch từ MongoDB → ownership check đầy đủ
    const view = await this.mongoRepo.findAnswerViewByAttempt(attemptId);
    if (!view) return null;

    if (view.studentId !== studentId) {
      throw new Error(
        `AccessDeniedError: Bạn không có quyền xem review của attempt "${attemptId}".`,
      );
    }

    const dto = this.toDTO(view);
    await this.cache.set(key, dto, AnalyticsCacheTTL.IMMUTABLE);
    return dto;
  }

  // GET /analytics/quizzes/:quizId/my-answer-history
  // → StudentQuizAnswerReviewDTO[]   (attemptNumber ASC — Repository đã ORDER BY)
  async byQuiz(
    studentId: string,
    quizId:    string,
  ): Promise<StudentQuizAnswerDTO[]> {
    const key    = AnalyticCacheKey.answerHistoryByQuiz(studentId, quizId);
    const cached = await this.cache.get<StudentQuizAnswerDTO[]>(key);
    if (cached) return cached;

    // Compound query (studentId, quizId) đảm bảo ownership — không cần check thêm
    const views = await this.mongoRepo.findAnswerViewsByStudentAndQuiz(studentId, quizId);
    const dtos  = views.map((view) => this.toDTO(view));
    await this.cache.set(key, dtos, AnalyticsCacheTTL.NORMAL);
    return dtos;
  }

  // private helpers
  // StudentQuizAnswerView (domain) → StudentQuizAnswerDTO (application)
  private toDTO(view: StudentQuizAnswerView): StudentQuizAnswerDTO {
    console.log('[StudentQuizAnswerQuery] Converting to DTO, answers count:', view.answers.length);
    console.log('[StudentQuizAnswerQuery] First answer sample:', view.answers[0]);

    const answerReviewData = view.answers.map((a) => ({
      question: {
        id: a.questionId,
        questionId: a.questionId,
        content: a.questionContent,
        questionType: 'SINGLE_CHOICE',  // Default, will be overridden by projector
        answerOptions: [
          // Reconstruct from denormalized data
          ...a.correctOptionIds.map((optId, idx) => ({
            id: optId,
            optionId: optId,
            content: a.correctOptionContents[idx] || '',
            isCorrect: true,
          })),
          // Include selected but incorrect options if not in correct list
          ...a.selectedOptionIds
            .filter(id => !a.correctOptionIds.includes(id))
            .map((optId, idx) => ({
              id: optId,
              optionId: optId,
              content: a.selectedOptionContents[idx] || '',
              isCorrect: false,
            })),
        ],
      },
      studentAnswer: {
        questionId: a.questionId,
        selectedOptionIds: [...a.selectedOptionIds],
        earnedPoints: a.earnedPoints,
        isCorrect: a.isCorrect,
      },
    }));

    console.log('[StudentQuizAnswerQuery] Built answerReview, count:', answerReviewData.length);

    const dto = {
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
      // Also provide frontend-compatible structure for QuizResultsPage
      score:         view.totalScore,  // Alias for frontend compatibility
      answerReview:  answerReviewData,
    } as any; // Type assertion due to extra fields added for frontend

    console.log('[StudentQuizAnswerQuery] Final DTO:', dto);
    return dto;
  }

  private toAnswerItemDTO(a: StudentAnswerDetail): AnswerItemDTO {
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