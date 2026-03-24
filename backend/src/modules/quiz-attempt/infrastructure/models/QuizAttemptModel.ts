import mongoose, { Schema, Document, Model } from "mongoose";
import { AttemptStatus } from "../../domain/value-objects/AttemptStatus";

// Cấu trúc MongoDB document (nested, load 1 lần toàn bộ attempt):
//   QuizAttemptDocument
//     └─ answers: StudentAnswerDocument[]
//
// Lý do chọn nested thay vì ref — giống Quiz Module:
//   - QuizAttempt aggregate luôn load cùng toàn bộ answers
//   - 1 attempt = 1 document → write-heavy phù hợp MongoDB
//   - Tránh populate — phù hợp với đặc tính write-heavy của context này
//   - Aggregate boundary rõ ràng: 1 document = 1 aggregate

// Sub-document interface
export interface IStudentAnswerDocument {
  answerId:          string;    // UUID, do domain tạo
  questionId:        string;
  selectedOptionIds: string[];  // SelectedOptions.optionIds
  isCorrect:         boolean;
  earnedPoints:      number;
}

// Root document interface
export interface IQuizAttemptDocument extends Document<string> {
  // attemptId là string UUID do domain tạo, lưu vào _id
  // để tận dụng unique index mặc định của MongoDB
  _id:            string;

  quizId:         string;
  studentId:      string;
  sectionId:      string;
  attemptNumber:  number;       // AttemptNumber.value
  status:         AttemptStatus;
  startedAt:      Date;
  submittedAt:    Date | null;
  expiresAt:      Date;         // startedAt + timeLimitMs — tính khi start, dùng cho expire job
  score:          number;       // Score.value
  maxScore:       number;       // Score.maxScore
  answers:        IStudentAnswerDocument[];
}

// Mongoose Schemas
const StudentAnswerSchema = new Schema<IStudentAnswerDocument>(
  {
    answerId:          { type: String,   required: true },
    questionId:        { type: String,   required: true },
    selectedOptionIds: { type: [String], default:  [] },
    isCorrect:         { type: Boolean,  required: true },
    earnedPoints:      { type: Number,   required: true, min: 0 },
  },
  {
    // Sub-document không cần _id riêng — dùng answerId (UUID)
    _id: false,
  }
);

const QuizAttemptSchema = new Schema<IQuizAttemptDocument>(
  {
    // _id = attemptId (string UUID)
    _id:           { type: String, required: true },

    quizId:        { type: String, required: true, index: true },
    studentId:     { type: String, required: true, index: true },
    sectionId:     { type: String, required: true, index: true },
    attemptNumber: { type: Number, required: true, min: 1 },

    status: {
      type:     String,
      required: true,
      enum:     Object.values(AttemptStatus),
      default:  AttemptStatus.IN_PROGRESS,
      index:    true,
    },

    startedAt:   { type: Date, required: true },
    submittedAt: { type: Date, default:  null },
    expiresAt:   { type: Date, required: true },  // startedAt + timeLimitMs
    score:       { type: Number, required: true, default: 0, min: 0 },
    maxScore:    { type: Number, required: true, min: 0 },

    answers: {
      type:    [StudentAnswerSchema],
      default: [],
    },
  },
  {
    _id:        false,
    versionKey: false,
  }
);

// Compound indexes
//
// (studentId, quizId) — query phổ biến nhất:
//   - countByStudentAndQuiz: đếm attempts để check maxAttempts
//   - Student xem lại kết quả các lần làm quiz
QuizAttemptSchema.index({ studentId: 1, quizId: 1 });

// (quizId, sectionId) — Analytics cần tổng hợp attempts theo quiz/section
QuizAttemptSchema.index({ quizId: 1, sectionId: 1 });

// (status, startedAt) — Background job tìm attempts InProgress quá giờ
QuizAttemptSchema.index({ status: 1, startedAt: 1 });

// Model export 
export const QuizAttemptModel: Model<IQuizAttemptDocument> = mongoose.model<IQuizAttemptDocument>(
  "QuizAttempt",
  QuizAttemptSchema,
  "quiz_attempts"   // tên collection — explicit
);