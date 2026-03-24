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
    return this.attemptModel
      .countDocuments({ studentId, quizId })
      .exec();
  }

  // expiresAt: Use Case tính khi start attempt (startedAt + timeLimitMs),
  // sau đó giữ nguyên qua submit/expire vì giá trị không thay đổi.
  async save(attempt: QuizAttempt): Promise<void> {
    // Nếu attempt mới (chưa có trong DB), expiresAt phải được set bởi caller
    // thông qua saveWithExpiry(). Nếu attempt đã tồn tại (submit/expire),
    // đọc expiresAt từ document cũ để giữ nguyên.
    const existing = await this.attemptModel
      .findById(attempt.attemptId)
      .select("expiresAt")
      .lean<{ expiresAt: Date }>()
      .exec();

    const expiresAt = existing?.expiresAt ?? new Date(0);

    const doc = QuizAttemptMapper.toPersistence(attempt, expiresAt);

    await this.attemptModel
      .replaceOne(
        { _id: attempt.attemptId },
        doc,
        { upsert: true },
      )
      .exec();
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