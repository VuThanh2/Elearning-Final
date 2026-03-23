import mongoose, { Schema, Document, Model } from "mongoose";
import { QuizStatus } from "../../domain/value-objects/QuizStatus";
import { QuestionType } from "../../domain/value-objects/QuestionType";

// Cấu trúc MongoDB document (nested, load 1 lần toàn bộ quiz):
//
//   QuizDocument
//     └─ questions: AnswerOptionDocument[]
//          └─ answerOptions: AnswerOptionDocument[]
//
// Lý do chọn nested thay vì ref:
//   - Quiz aggregate luôn được load cùng toàn bộ question + option
//   - Tránh JOIN / populate — phù hợp MongoDB
//   - Aggregate boundary rõ ràng: 1 document = 1 aggregate

// Sub-document interfaces (không extend Document vì là embedded)

export interface IAnswerOptionDocument {
  optionId:   string;   // UUID, do domain tạo — không dùng ObjectId
  content:    string;
  isCorrect:  boolean;
}

export interface IQuestionDocument {
  questionId:    string;   // UUID
  content:       string;
  questionType:  QuestionType;
  answerOptions: IAnswerOptionDocument[];
}

// Root document interface
export interface IQuizDocument extends Document<string> {
  // quizId là string UUID do domain tạo, lưu vào _id của Mongoose
  // để tận dụng unique index mặc định của MongoDB mà không cần thêm
  // index riêng cho quizId.
  _id:          string;

  teacherId:    string;
  sectionId:    string;
  title:        string;
  description:  string;
  timeLimitMinutes: number;       // TimeLimit.minutes
  deadlineAt:   Date;             // Deadline.value
  maxAttempts:  number;           // MaxAttempts.value
  maxScore:     number;           // Points.value
  status:       QuizStatus;
  questions:    IQuestionDocument[];
  hiddenReason: string | null;
  createdAt:    Date;
  updatedAt:    Date | null;
}

// Mongoose Schemas
const AnswerOptionSchema = new Schema<IAnswerOptionDocument>(
  {
    optionId:  { type: String, required: true },
    content:   { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  {
    // Sub-document không cần _id riêng — dùng optionId (UUID) làm định danh
    _id: false,
  }
);

const QuestionSchema = new Schema<IQuestionDocument>(
  {
    questionId:   { type: String, required: true },
    content:      { type: String, required: true },
    questionType: {
      type:     String,
      required: true,
      enum:     Object.values(QuestionType),
    },
    answerOptions: {
      type:    [AnswerOptionSchema],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const QuizSchema = new Schema<IQuizDocument>(
  {
    // Dùng _id = quizId (string UUID) thay vì ObjectId mặc định
    _id:         { type: String, required: true },

    teacherId:   { type: String, required: true, index: true },
    sectionId:   { type: String, required: true, index: true },
    title:       { type: String, required: true },
    description: { type: String, required: true, default: "" },

    timeLimitMinutes: { type: Number, required: true, min: 1 },
    deadlineAt:       { type: Date,   required: true },
    maxAttempts:      { type: Number, required: true, min: 1 },
    maxScore:         { type: Number, required: true, min: 0 },

    status: {
      type:     String,
      required: true,
      enum:     Object.values(QuizStatus),
      default:  QuizStatus.DRAFT,
      index:    true,
    },

    questions: {
      type:    [QuestionSchema],
      default: [],
    },

    hiddenReason: { type: String, default: null },

    // createdAt/updatedAt tự quản lý thay vì dùng timestamps: true
    // vì updatedAt trong domain có thể là null (quiz chưa từng được update)
    // — timestamps: true luôn set giá trị khi document được tạo.
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, default: null },
  },
  {
    // Tắt auto _id vì ta dùng _id = quizId (string)
    _id:        false,

    // Tắt versionKey (__v) — không dùng optimistic concurrency qua Mongoose
    // (nếu cần concurrency control thì xử lý ở application layer)
    versionKey: false,
  }
);

// Compound indexes
//
// (teacherId, sectionId) — query phổ biến nhất: Teacher xem quiz của mình
// trong một Section. Compound index hiệu quả hơn 2 single-field index riêng.
QuizSchema.index({ teacherId: 1, sectionId: 1 });

// (sectionId, status) — Quiz Attempt Context cần lấy Published quiz theo Section
QuizSchema.index({ sectionId: 1, status: 1 });

// (deadlineAt, status) — Background job QuizExpirationJob scan quiz sắp hết hạn
QuizSchema.index({ deadlineAt: 1, status: 1 });

// Model export
export const QuizModel: Model<IQuizDocument> = mongoose.model<IQuizDocument>(
  "Quiz",
  QuizSchema,
  "quizzes"   // tên collection — explicit để không bị Mongoose tự pluralize
);