import mongoose from "mongoose";
import { QuizAttemptModel } from "../models/QuizAttemptModel";

// Khởi tạo collection và indexes cho Quiz Attempt Context.
//
// Lý do cần file này (giống Quiz Module):
//
//   1. Indexes trong production:
//      autoIndex bị tắt ở production để tránh index rebuild
//      chặn write trên collection lớn. File này chạy 1 lần
//      khi deploy lên môi trường mới — đảm bảo indexes tồn tại
//      trước khi traffic vào.
//
//   2. JSON Schema validator ở collection level:
//      Lớp bảo vệ thứ hai bên dưới Mongoose. Nếu tool nào đó
//      (script migration, Compass...) ghi thẳng vào DB mà bỏ qua
//      Mongoose, validator vẫn chặn document không hợp lệ.
//
//   3. Idempotent — chạy nhiều lần không gây lỗi.
//
// Cách chạy:
//   npx tsx src/modules/quiz-attempt/infrastructure/scripts/init-mongo.ts
export async function initQuizAttemptMongo(): Promise<void> {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("initQuizAttemptMongo: MongoDB chưa được connect.");
  }

  console.log("[QuizAttempt] Bắt đầu khởi tạo MongoDB collection và indexes...");

  // Bước 1: Tạo collection "quiz_attempts" nếu chưa tồn tại
  //
  // Chỉ validate required fields cơ bản — không duplicate business rule
  // của domain layer. Mục tiêu: chặn document hoàn toàn thiếu field
  // bắt buộc từ mọi nguồn ghi.
  const existingCollections = await db
    .listCollections({ name: "quiz_attempts" })
    .toArray();

  if (existingCollections.length === 0) {
    await db.createCollection("quiz_attempts", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: [
            "_id",
            "quizId",
            "studentId",
            "sectionId",
            "attemptNumber",
            "status",
            "startedAt",
            "expiresAt",
            "score",
            "maxScore",
          ],
          properties: {
            _id:           { bsonType: "string" },   // attemptId (UUID)
            quizId:        { bsonType: "string" },
            studentId:     { bsonType: "string" },
            sectionId:     { bsonType: "string" },
            attemptNumber: { bsonType: "int", minimum: 1 },
            status: {
              bsonType: "string",
              enum: ["InProgress", "Submitted", "Expired"],
            },
            startedAt:   { bsonType: "date" },
            submittedAt: { bsonType: ["date", "null"] },
            // expiresAt = startedAt + timeLimitMs — tính khi start attempt,
            // dùng cho AttemptExpirationJob scan attempt quá giờ
            expiresAt:   { bsonType: "date" },
            score:       { bsonType: "number", minimum: 0 },
            maxScore:    { bsonType: "number", minimum: 0 },
            answers: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: [
                  "answerId",
                  "questionId",
                  "selectedOptionIds",
                  "isCorrect",
                  "earnedPoints",
                ],
                properties: {
                  answerId:          { bsonType: "string" },
                  questionId:        { bsonType: "string" },
                  selectedOptionIds: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                  },
                  isCorrect:    { bsonType: "bool" },
                  earnedPoints: { bsonType: "number", minimum: 0 },
                },
              },
            },
          },
        },
      },
      validationLevel:  "strict",
      validationAction: "error",
    });

    console.log("[QuizAttempt] Collection 'quiz_attempts' đã được tạo với JSON Schema validator.");
  } else {
    console.log("[QuizAttempt] Collection 'quiz_attempts' đã tồn tại, bỏ qua bước tạo.");
  }

  // Bước 2: Đồng bộ indexes từ Mongoose schema xuống MongoDB
  //
  // syncIndexes() thực hiện 3 việc:
  //   - Tạo index mới có trong schema nhưng chưa có trong DB
  //   - Drop index có trong DB nhưng không còn trong schema
  //   - Không đụng đến index _id (luôn giữ nguyên)
  //
  // Indexes được định nghĩa trong QuizAttemptModel (QuizAttemptSchema.index(...)):
  //   { studentId: 1, quizId: 1 }   compound
  //     → countByStudentAndQuiz() — check maxAttempts trước khi start
  //
  //   { quizId: 1, sectionId: 1 }   compound
  //     → Analytics Context tổng hợp attempts theo quiz/section
  await QuizAttemptModel.syncIndexes();
  console.log("[QuizAttempt] Indexes đã được đồng bộ.");

  console.log("[QuizAttempt] Khởi tạo MongoDB hoàn tất.");
}

// Entrypoint khi chạy file trực tiếp bằng tsx
const isMain =
  process.argv[1]?.endsWith("init-mongo.ts") ||
  process.argv[1]?.endsWith("init-mongo.js");

if (isMain) {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("Thiếu biến môi trường MONGO_URI.");
    process.exit(1);
  }

  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("MongoDB connected.");
      await initQuizAttemptMongo();
      await mongoose.disconnect();
      console.log("MongoDB disconnected.");
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("Lỗi khi init MongoDB:", err);
      process.exit(1);
    });
}