import { IMongoAnalyticsRepository }                        from "../../domain/interface-repositories/IMongoAnalyticsRepository";
import { IAcademicQueryService }                            from "../../../academic";
import { QuestionFailureRateView, QuestionFailureStat }    from "../../domain/read-models/QuestionFailureRateView";
import { QuestionFailureRateDTO, QuestionFailureStatDTO }  from "../dtos/QuestionFailureRateDTO";

// Actor:   Teacher
// Permission: VIEW_ANALYTICS
const MIN_SAMPLE = 5;

export class QuestionFailureRateQuery {
  constructor(
    private readonly mongoRepo:       IMongoAnalyticsRepository,
    private readonly academicService: IAcademicQueryService,
  ) {}

  // GET /analytics/sections/:sectionId/quizzes/:quizId/question-failure-rate
  // → QuestionFailureRateDTO | null
  async execute(
    teacherId: string,
    quizId:    string,
    sectionId: string,
  ): Promise<QuestionFailureRateDTO | null> {
    const ok = await this.academicService.isTeacherAssignedToSection(teacherId, sectionId);
    if (!ok) throw new Error(
      `AccessDeniedError: Teacher không được phép xem question failure rate của section "${sectionId}".`,
    );

    const view = await this.mongoRepo.findQuestionFailureRate(quizId, sectionId);
    return view ? this.toDTO(view) : null;
  }

  // private helpers 
  // QuestionFailureRateView (domain) → QuestionFailureRateDTO (application)
  private toDTO(view: QuestionFailureRateView): QuestionFailureRateDTO {
    return {
      quizId:                 view.quizId,
      sectionId:              view.sectionId,
      quizTitle:              view.quizTitle,
      sectionName:            view.sectionName,
      totalSubmittedAttempts: view.totalSubmittedAttempts,
      hasInsufficientData:    view.totalSubmittedAttempts < MIN_SAMPLE,
      lastUpdatedAt:          view.lastUpdatedAt.toISOString(),
      // Sắp xếp failureRate DESC ở đây — presentation concern của Query
      questions: view.questions
        .map((q) => this.toStatDTO(q))
        .sort((a, b) => b.failureRate - a.failureRate),
    };
  }

  private toStatDTO(q: QuestionFailureStat): QuestionFailureStatDTO {
    return {
      questionId:                     q.questionId,
      questionContent:                q.questionContent,
      totalQuestionAttempts:          q.totalQuestionAttempts,
      correctAnswers:                 q.correctAnswers,
      wrongAnswers:                   q.wrongAnswers,
      unansweredCount:                q.unansweredCount,
      failureRate:                    q.failureRate,
      mostSelectedWrongOptionId:      q.mostSelectedWrongOptionId,
      mostSelectedWrongOptionContent: q.mostSelectedWrongOptionContent,
    };
  }
}