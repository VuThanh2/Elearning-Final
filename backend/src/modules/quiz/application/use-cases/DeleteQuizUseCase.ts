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
    console.log(`[DeleteQuizUseCase] ENTRY: quizId=${quizId}, teacherId=${teacherId}`);

    // Bước 1: load quiz
    const quiz = await this.quizRepository.findById(quizId);
    if (!quiz) {
      throw new Error(`NotFoundError: Quiz "${quizId}" không tồn tại.`);
    }
    console.log(`[DeleteQuizUseCase] Loaded quiz:`, { quizId, status: quiz.status, sectionId: quiz.sectionId });

    // Bước 2: ownership check
    if (quiz.teacherId !== teacherId) {
      throw new Error(
        "AccessDeniedError: Bạn không có quyền xóa quiz này."
      );
    }
    console.log(`[DeleteQuizUseCase] Ownership check OK`);

    // Bước 3: chỉ DRAFT hoặc HIDDEN mới xóa được
    if (quiz.status !== "Draft" && quiz.status !== "Hidden") {
      throw new Error(
        `DomainError: Chỉ có thể xóa quiz ở trạng thái Draft hoặc Hidden (hiện tại: "${quiz.status}").`
      );
    }
    console.log(`[DeleteQuizUseCase] Status check OK`);

    // Bước 4: delete từ repository
    console.log(`[DeleteQuizUseCase] Deleting quiz from repository`);
    await this.quizRepository.delete(quizId);
    console.log(`[DeleteQuizUseCase] Quiz deleted from repository`);

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

    console.log(`[DeleteQuizUseCase] Cache keys to invalidate:`, keysToInvalidate);
    await this.analyticCache.invalidate(keysToInvalidate);
    console.log(`[DeleteQuizUseCase] Invalidated exact keys`);

    console.log(`[DeleteQuizUseCase] Invalidating pattern:`, AnalyticCacheKey.HIER_PATTERN);
    await this.analyticCache.invalidatePattern(AnalyticCacheKey.HIER_PATTERN);
    console.log(`[DeleteQuizUseCase] Invalidated hierarchical pattern`);

    // Bước 5b: delete student attempts from MongoDB
    console.log(`[DeleteQuizUseCase] Deleting student attempts for quizId=${quizId} from MongoDB`);
    try {
      const deleteResult = await this.studentAnswerModel.deleteMany({ quizId });
      console.log(`[DeleteQuizUseCase] Deleted ${deleteResult.deletedCount} student attempts from MongoDB`);
    } catch (err) {
      console.error(`[DeleteQuizUseCase] Failed to delete student attempts:`, err instanceof Error ? err.message : err);
    }

    // Bước 6: publish event
    console.log(`[DeleteQuizUseCase] Publishing QuizDeleted event`);
    await this.eventPublisher.publish(
      new QuizDeleted(quizId, teacherId, sectionId)
    );
    console.log(`[DeleteQuizUseCase] Event published, delete complete`);
  }
}
