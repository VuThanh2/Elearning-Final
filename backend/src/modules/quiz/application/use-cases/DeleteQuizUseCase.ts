import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { IEventPublisher } from "../interfaces/IEventPublisher";
import { QuizDeleted } from "../../domain/events/QuizDeleted";
import { IAnalyticCache, AnalyticCacheKey } from "../../../analytic/domain/interface-repositories/IAnalyticCache";
import { StudentQuizAnswerModel } from "../../../analytic/infrastructure/database/nosql/models/StudentQuizAnswerModel";

// Teacher xóa quiz (chỉ DRAFT hoặc HIDDEN được phép xóa).
//
// Flow:
//   1. Load quiz, kiểm tra tồn tại
//   2. Kiểm tra Teacher là owner
//   3. Kiểm tra status (chỉ DRAFT hoặc HIDDEN mới xóa được)
//   4. Delete quiz từ repository
//   5. Invalidate analytics cache để xóa quiz khỏi reports
//   6. Publish QuizDeleted event
//   7. Không trả về gì (204 No Content)

export class DeleteQuizUseCase {
  constructor(
    private readonly quizRepository: IQuizRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly analyticCache: IAnalyticCache,
    private readonly studentAnswerModel: typeof StudentQuizAnswerModel,
  ) {}

  async execute(
    teacherId: string,
    quizId: string
  ): Promise<void> {
    // Bước 1: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }

    // Bước 2: ownership check
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền xóa quiz này."
      );
    }

    // Bước 3: chỉ DRAFT hoặc HIDDEN mới xóa được
    if (quiz.status !== "Draft" && quiz.status !== "Hidden") {
      throw new Error(
        `DomainError: Chỉ có thể xóa quiz ở trạng thái Draft hoặc Hidden (hiện tại: "${quiz.status}").`
      );
    }

    // Bước 4: delete từ repository
    await this.quizRepository.delete(quizId);

    // Bước 5: invalidate analytics cache
    const sectionId = quiz.sectionId;
    const keysToInvalidate = [
      AnalyticCacheKey.quizPerformance(quizId, sectionId),
      AnalyticCacheKey.sectionPerformance(sectionId),
      AnalyticCacheKey.questionFailureRate(quizId, sectionId),
      AnalyticCacheKey.scoreDistribution(quizId, sectionId),
      AnalyticCacheKey.atRiskStudents(sectionId),
      AnalyticCacheKey.sectionRanking(sectionId),
    ];
    await this.analyticCache.invalidate(keysToInvalidate);
    await this.analyticCache.invalidatePattern(AnalyticCacheKey.HIER_PATTERN);

    // Bước 5b: delete student attempts from MongoDB
    try {
      await this.studentAnswerModel.deleteMany({ quizId });
    } catch (err) {
      // Silent fail - attempt deletion failure shouldn't block quiz deletion
    }

    // Bước 6: publish event
    await this.eventPublisher.publish(
      new QuizDeleted(quizId, teacherId, sectionId)
    );
  }
}
