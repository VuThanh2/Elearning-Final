import { IQuizRepository } from "../../domain/interface-repositories/IQuizRepository";
import { Quiz } from "../../domain/entities/Quiz";
import { QuizStatus } from "../../domain/value-objects/QuizStatus";
import { QuizModel, IQuizDocument } from "../models/QuizModel";
import { QuizMapper } from "../mappers/QuizMapper";

// Nhận QuizModel (Mongoose Model) qua constructor thay vì import trực tiếp — lý do:
//   - Dễ mock khi viết test (truyền mock model vào)
//   - Không coupling cứng vào Mongoose instance toàn cục
//
// Tất cả query đều dùng .lean() để nhận plain JS object thay vì
// Mongoose Document đầy đủ — hiệu suất cao hơn vì bỏ qua overhead
// của Mongoose Document instance (getter/setter, tracking changes...).
// Mapper nhận IQuizDocument (interface) nên hoạt động tốt với plain object.
//
// save() dùng replaceOne + upsert thay vì findById rồi doc.save() — lý do:
//   - Atomic: không cần 2 round-trip (findById + save)
//   - Tránh conflict giữa Mongoose Document state và domain entity state
//   - Quiz là aggregate nhỏ, replace toàn bộ document đơn giản và an toàn

export class QuizRepository implements IQuizRepository {
  constructor(
    private readonly quizModel: typeof QuizModel
  ) {}

  async findById(quizId: string): Promise<Quiz | null> {
    const doc = await this.quizModel
      .findById(quizId)
      .lean<IQuizDocument>()
      .exec();

    if (!doc) return null;

    return QuizMapper.toDomain(doc);
  }

  // Dùng compound index (teacherId, sectionId) — đã khai báo trong QuizModel.
  // Trả về toàn bộ quiz (mọi status) để Teacher thấy tất cả quiz của mình.
  async findByTeacherAndSection(
    teacherId: string,
    sectionId: string
  ): Promise<Quiz[]> {
    const docs = await this.quizModel
      .find({ teacherId, sectionId })
      .lean<IQuizDocument[]>()
      .exec();

    return docs.map(QuizMapper.toDomain);
  }

  // Dùng compound index (sectionId, status).
  // Chỉ trả về quiz Published — dành cho Student chọn quiz để làm.
  async findPublishedBySection(sectionId: string): Promise<Quiz[]> {
    const docs = await this.quizModel
      .find({ sectionId, status: QuizStatus.PUBLISHED })
      .lean<IQuizDocument[]>()
      .exec();

    return docs.map(QuizMapper.toDomain);
  }

  // Không nằm trong IQuizRepository interface vì đây là method nội bộ
  // chỉ dùng bởi QuizExpirationJob (background job) — không phải use case của Teacher.
  
  // Tìm tất cả quiz Published hoặc Hidden có deadline đã qua —
  // background job sẽ gọi quiz.expire() rồi save() từng cái.
  //
  // Dùng compound index (deadlineAt, status).
  async findExpiredCandidates(now: Date): Promise<Quiz[]> {
    const docs = await this.quizModel
      .find({
        deadlineAt: { $lte: now },
        status: { $in: [QuizStatus.PUBLISHED, QuizStatus.HIDDEN] },
      })
      .lean<IQuizDocument[]>()
      .exec();

    return docs.map(QuizMapper.toDomain);
  }

  // replaceOne + upsert:
  //   - Nếu document chưa tồn tại (quiz mới) → insert
  //   - Nếu đã tồn tại → replace toàn bộ document
  //
  // Không dùng updateOne + $set vì aggregate nhỏ và nested questions
  // có thể thay đổi phức tạp (thêm/xóa/sửa question, option) —
  // replace đơn giản hơn và không có nguy cơ partial update.
  async save(quiz: Quiz): Promise<void> {
    const doc = QuizMapper.toPersistence(quiz);

    try {
      await this.quizModel
        .replaceOne(
          { _id: quiz.quizId },
          doc,
          { upsert: true }
        )
        .exec();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown database error";
      throw new Error(`InfrastructureError: Lỗi khi lưu quiz: ${message}`);
    }
  }

  // Xóa quiz (chỉ cho Draft và Hidden status)
  async delete(quizId: string): Promise<void> {
    try {
      await this.quizModel
        .deleteOne({ _id: quizId })
        .exec();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown database error";
      throw new Error(`InfrastructureError: Lỗi khi xóa quiz: ${message}`);
    }
  }

  // Dùng countDocuments với limit 1 thay vì findOne — không cần load
  // toàn bộ document, chỉ cần biết có tồn tại không.
  async existsByTeacherAndSection(
    teacherId: string,
    sectionId: string
  ): Promise<boolean> {
    const count = await this.quizModel
      .countDocuments({ teacherId, sectionId })
      .limit(1)
      .exec();

    return count > 0;
  }
}