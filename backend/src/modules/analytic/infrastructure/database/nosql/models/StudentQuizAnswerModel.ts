// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: StudentQuizAnswerView + StudentAnswerDetail
//                     (domain/read-models/StudentQuizAnswerView.ts)
//
// Tại sao MongoDB thay vì Oracle?
//   answers[] là mảng nested — nếu lưu Oracle phải tách thành bảng riêng
//   ANALYTICS_STUDENT_QUIZ_ANSWERS_DETAIL rồi JOIN mỗi lần query.
//   MongoDB 1 document = 1 attempt = đủ data để render answer review screen.
//   Không cần JOIN, 1 findOne() là xong.
//
// Cấu trúc document:
//   StudentQuizAnswerDocument
//     └─ answers: StudentAnswerDetailDocument[]   (embedded array)
import mongoose, { Schema, Document, Model } from "mongoose";

// Sub-document interface
export interface IStudentAnswerDetailDocument {
  questionId:              string;
  questionContent:         string;
  selectedOptionIds:       string[];
  selectedOptionContents:  string[];
  correctOptionIds:        string[];
  correctOptionContents:   string[];
  isCorrect:               boolean;
  earnedPoints:            number;
  questionPoints:          number;
}

// Root document interface
export interface IStudentQuizAnswerDocument extends Document<string> {
  _id:            string; // attemptId
  quizId:         string;
  studentId:      string;
  sectionId:      string;
  totalScore:     number;
  maxScore:       number;
  submittedAt:    Date;
  attemptNumber:  number;
  status:         "SUBMITTED" | "EXPIRED";
  answers:        IStudentAnswerDetailDocument[];
}

// Mongoose Schemas 
const StudentAnswerDetailSchema = new Schema<IStudentAnswerDetailDocument>(
  {
    questionId:             { type: String,   required: true },
    questionContent:        { type: String,   required: true },
    selectedOptionIds:      { type: [String], default: [] },
    selectedOptionContents: { type: [String], default: [] },
    correctOptionIds:       { type: [String], required: true },
    correctOptionContents:  { type: [String], required: true },
    isCorrect:              { type: Boolean,  required: true },
    earnedPoints:           { type: Number,   required: true, min: 0 },
    questionPoints:         { type: Number,   required: true, min: 0 },
  },
  {
    _id: false, // sub-document không cần _id riêng
  }
);

const StudentQuizAnswerSchema = new Schema<IStudentQuizAnswerDocument>(
  {
    _id:           { type: String, required: true }, // attemptId
    quizId:        { type: String, required: true },
    studentId:     { type: String, required: true },
    sectionId:     { type: String, required: true },
    totalScore:    { type: Number, required: true, min: 0 },
    maxScore:      { type: Number, required: true, min: 0 },
    submittedAt:   { type: Date,   required: true },
    attemptNumber: { type: Number, required: true, min: 1 },

    status: {
      type:     String,
      required: true,
      enum:     ["SUBMITTED", "EXPIRED"],
    },

    answers: {
      type:    [StudentAnswerDetailSchema],
      default: [],
    },
  },
  {
    _id:        false, // dùng _id = attemptId (string)
    versionKey: false,
  }
);

// Indexes 
//
// (studentId, quizId) — findAnswerViewsByStudentAndQuiz()
//   Student xem lịch sử tất cả lần làm quiz với đáp án chi tiết.
StudentQuizAnswerSchema.index({ studentId: 1, quizId: 1 });

// (studentId, sectionId) — nếu sau này cần list tất cả answer views theo section
StudentQuizAnswerSchema.index({ studentId: 1, sectionId: 1 });

// Model export 
export const StudentQuizAnswerModel: Model<IStudentQuizAnswerDocument> =
  mongoose.model<IStudentQuizAnswerDocument>(
    "AnalyticsStudentQuizAnswer",
    StudentQuizAnswerSchema,
    "analytics_student_quiz_answers", // tên collection — explicit
  );