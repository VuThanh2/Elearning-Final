// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: QuestionFailureRateView + QuestionFailureStat
//                     (domain/read-models/QuestionFailureRateView.ts)
//
// Cấu trúc document:
//   QuestionFailureRateDocument
//     └─ questions: QuestionFailureStatDocument[]   (embedded)
//     └─ processedAttemptIds: string[]              (idempotency guard)
//
// Collection: analytics_question_failure_rate
// _id: compound string "{quizId}_{sectionId}" — dễ upsert bằng filter
import mongoose, { Schema, Document, Model } from "mongoose";

// Sub-document interface 
export interface IQuestionFailureStatDocument {
  questionId:                      string;
  questionContent:                 string;
  totalQuestionAttempts:           number; // số lần câu này được trả lời
  correctAnswers:                  number;
  wrongAnswers:                    number;
  unansweredCount:                 number; // số lần bỏ trống (selectedOptionIds rỗng)
  failureRate:                     number; // wrongAnswers / totalQuestionAttempts, 0–1
  wrongOptionCounts: Record<string, number>;
  mostSelectedWrongOptionId:       string | null;
  mostSelectedWrongOptionContent:  string | null;
}

// Root document interface 
export interface IQuestionFailureRateDocument extends Document<string> {
  _id:                    string; // "{quizId}_{sectionId}"
  quizId:                 string;
  sectionId:              string;
  quizTitle:              string;
  sectionName:            string;
  totalSubmittedAttempts: number; // tổng attempt đã submit trong scope này
  lastUpdatedAt:          Date;
  questions:              IQuestionFailureStatDocument[];

  // Idempotency guard: tập hợp attemptId đã được cộng dồn vào document này.
  // Projector check trước khi update — nếu attemptId đã có → skip.
  // Dùng Set semantics: không có duplicate.
  processedAttemptIds: string[];
}

// Mongoose Schemas 
const QuestionFailureStatSchema = new Schema<IQuestionFailureStatDocument>(
  {
    questionId:                     { type: String,  required: true },
    questionContent:                { type: String,  required: true },
    totalQuestionAttempts:          { type: Number,  default: 0, min: 0 },
    correctAnswers:                 { type: Number,  default: 0, min: 0 },
    wrongAnswers:                   { type: Number,  default: 0, min: 0 },
    unansweredCount:                { type: Number,  default: 0, min: 0 },
    failureRate:                    { type: Number,  default: 0, min: 0, max: 1 },
    wrongOptionCounts: {
      type:    Schema.Types.Mixed,
      default: {},
    },
    mostSelectedWrongOptionId:      { type: String,  default: null },
    mostSelectedWrongOptionContent: { type: String,  default: null },
  },
  {
    _id: false,
  }
);

const QuestionFailureRateSchema = new Schema<IQuestionFailureRateDocument>(
  {
    _id:                    { type: String, required: true }, // "{quizId}_{sectionId}"
    quizId:                 { type: String, required: true },
    sectionId:              { type: String, required: true },
    quizTitle:              { type: String, required: true },
    sectionName:            { type: String, required: true },
    totalSubmittedAttempts: { type: Number, default: 0, min: 0 },
    lastUpdatedAt:          { type: Date,   default: () => new Date() },

    questions: {
      type:    [QuestionFailureStatSchema],
      default: [],
    },

    processedAttemptIds: {
      type:    [String],
      default: [],
    },
  },
  {
    _id:        false, // dùng _id = "{quizId}_{sectionId}" (string)
    versionKey: false,
  }
);

// Indexes
//
// (quizId, sectionId) — findQuestionFailureRate(quizId, sectionId)
//   Primary access pattern: Teacher chọn quiz → xem failure rate.
//   _id đã là "{quizId}_{sectionId}" nhưng compound index này
//   giúp query bằng field riêng lẻ nếu cần filter theo quizId hoặc sectionId.
QuestionFailureRateSchema.index({ quizId: 1, sectionId: 1 });

// Model export
export const QuestionFailureRateModel: Model<IQuestionFailureRateDocument> =
  mongoose.model<IQuestionFailureRateDocument>(
    "AnalyticsQuestionFailureRate",
    QuestionFailureRateSchema,
    "analytics_question_failure_rate", // tên collection — explicit
  );