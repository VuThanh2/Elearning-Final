import { IQuizAttemptRepository } from "../../domain/interface-repositories/IQuizAttemptRepository";
import { QuizAttempt } from "../../domain/entities/QuizAttempt";
import { AttemptStatus } from "../../domain/value-objects/AttemptStatus";
import { QuizAttemptModel, IQuizAttemptDocument } from "../models/QuizAttemptModel";
import { QuizAttemptMapper } from "../mappers/QuizAttemptMapper";

// Nhận QuizAttemptModel qua constructor:
//   - Dễ mock khi test
//   - Không coupling cứng vào Mongoose instance toàn cục
//
// Tất cả query dùng .lean() 
//
// save() cần expiresAt — giá trị này không nằm trong domain entity
// mà được tính bởi Use Case (startedAt + timeLimitMs) và truyền vào
// repository khi save. Repository lưu expiresAt vào document để
// findExpiredCandidates() có thể query mà không cần cross-context lookup.
export class QuizAttemptRepository implements IQuizAttemptRepository {
  constructor(
    private readonly attemptModel: typeof QuizAttemptModel,
  ) {}

  async findById(attemptId: string): Promise<QuizAttempt | null> {
    const doc = await this.attemptModel
      .findById(attemptId)
      .lean<IQuizAttemptDocument>()
      .exec();

    if (!doc) return null;

    return QuizAttemptMapper.toDomain(doc);
  }

  // Dùng compound index (studentId, quizId).
  // Đếm tất cả attempt (mọi status) — dùng để check maxAttempts
  // trước khi cho student start attempt mới.
  async countByStudentAndQuiz(
    studentId: string,
    quizId: string,
  ): Promise<number> {
    const count = await this.attemptModel
      .countDocuments({ studentId, quizId })
      .exec();
    console.log('[QuizAttemptRepository.countByStudentAndQuiz]', { studentId, quizId, count });
    return count;
  }

  // Tìm attempt đang InProgress cho student+quiz — prevent multiple active attempts
  async findInProgressByStudentAndQuiz(
    studentId: string,
    quizId: string,
  ): Promise<QuizAttempt | null> {
    console.log('[QuizAttemptRepository.findInProgressByStudentAndQuiz] ENTRY', { studentId, quizId });
    const doc = await this.attemptModel
      .findOne({ studentId, quizId, status: AttemptStatus.IN_PROGRESS })
      .lean<IQuizAttemptDocument>()
      .exec();

    if (!doc) {
      console.log('[QuizAttemptRepository.findInProgressByStudentAndQuiz] No InProgress attempt found');
      return null;
    }

    console.log('[QuizAttemptRepository.findInProgressByStudentAndQuiz] Found InProgress:', { attemptId: doc._id, status: doc.status });
    return QuizAttemptMapper.toDomain(doc);
  }

  // dùng $set, không query DB lần 2
  //
  // Chỉ update đúng những field thay đổi khi save:
  //   status, submittedAt, score, answers
  // expiresAt, startedAt, studentId, quizId, sectionId... không bị đụng.
  //
  // matchedCount === 0 nghĩa là caller dùng sai flow —
  // attempt phải được saveNewAttempt() trước. Throw để lộ bug sớm.
  async save(attempt: QuizAttempt): Promise<void> {
    const update = QuizAttemptMapper.toFinalizedUpdate(attempt);
    console.log('[QuizAttemptRepository.save] ENTRY:', { attemptId: attempt.attemptId, updateData: update });

    const result = await this.attemptModel
      .updateOne(
        { _id: attempt.attemptId },
        { $set: update },
      )
      .exec();

    console.log('[QuizAttemptRepository.save] MongoDB result:', { attemptId: attempt.attemptId, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });

    if (result.matchedCount === 0) {
      throw new Error(
        `RepositoryError: Attempt "${attempt.attemptId}" không tồn tại. ` +
        `Dùng saveNewAttempt() khi tạo attempt mới.`
      );
    }
  }

  // Save attempt mới với expiresAt — chỉ dùng khi start attempt.
  // Tách riêng vì expiresAt chỉ được tính 1 lần khi start,
  // sau đó save() thông thường giữ nguyên giá trị.
  async saveNewAttempt(attempt: QuizAttempt, expiresAt: Date): Promise<void> {
    const doc = QuizAttemptMapper.toPersistence(attempt, expiresAt);

    await this.attemptModel
      .replaceOne(
        { _id: attempt.attemptId },
        doc,
        { upsert: true },
      )
      .exec();
  }

  // Tìm tất cả attempt InProgress đã quá giờ.
  // Dùng compound index (status, expiresAt).
  //
  // Background job gọi method này, với mỗi attempt tìm được:
  //   1. Lấy quizGradingData từ Quiz Context
  //   2. Gọi attempt.expire() — chấm điểm những câu đã có 
  //   3. Save lại
  //   4. Publish QuizAttemptExpired event
  async findExpiredCandidates(now: Date): Promise<QuizAttempt[]> {
    const docs = await this.attemptModel
      .find({
        status:    AttemptStatus.IN_PROGRESS,
        expiresAt: { $lte: now },
      })
      .lean<IQuizAttemptDocument[]>()
      .exec();

    return docs.map(QuizAttemptMapper.toDomain);
  }
}