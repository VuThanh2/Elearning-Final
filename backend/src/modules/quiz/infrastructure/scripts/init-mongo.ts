import mongoose from "mongoose";
import { QuizModel } from "../models/QuizModel";

//Khởi tạo collection và indexes cho Quiz Context
//
// Tại sao cần file này dù MongoDB tự tạo collection khi insert:
//
//   1. Indexes trong production:
//      Mongoose có autoIndex: true mặc định ở development,
//      nhưng best practice là TẮT autoIndex ở production để tránh
//      index rebuild chặn write operation trên collection lớn.
//      File này chạy thủ công một lần khi deploy lên môi trường mới
//      → đảm bảo indexes tồn tại trước khi traffic vào.
//
//   2. Validator ở collection level:
//      Ta có thể đặt JSON Schema validator trực tiếp trên collection
//      như một lớp bảo vệ thứ hai bên dưới Mongoose schema.
//      Nếu sau này có tool khác (script migration, Compass...) ghi
//      thẳng vào DB mà bỏ qua Mongoose, validator vẫn chặn được
//      document không hợp lệ.
//
//   3. Idempotent — chạy nhiều lần không gây lỗi:
//      createCollection với { strict: false } không throw nếu collection
//      đã tồn tại. syncIndexes() drop index cũ không còn trong schema
//      và tạo index mới nếu chưa có.
//
// Cách chạy:
//   npx tsx src/modules/quiz/infrastructure/scripts/init-mongo.ts
//
// Hoặc gọi initQuizMongo() từ server bootstrap trước khi start server.

export async function initQuizMongo(): Promise<void> {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("initQuizMongo: MongoDB chưa được connect.");
  }

  console.log("🔧 [Quiz] Bắt đầu khởi tạo MongoDB collection và indexes...");

  // Bước 1: Tạo collection "quizzes" nếu chưa tồn tại
  //
  // createCollection() với validator JSON Schema —
  // lớp bảo vệ ở tầng DB, độc lập với Mongoose.
  //
  // Chỉ validate các required field cơ bản — không duplicate toàn bộ
  // business rule (đó là việc của domain layer). Mục tiêu: chặn
  // document hoàn toàn thiếu field bắt buộc từ mọi nguồn ghi.

  const existingCollections = await db
    .listCollections({ name: "quizzes" })
    .toArray();

  if (existingCollections.length === 0) {
    await db.createCollection("quizzes", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: [
            "_id",
            "teacherId",
            "sectionId",
            "title",
            "timeLimitMinutes",
            "deadlineAt",
            "maxAttempts",
            "maxScore",
            "status",
            "createdAt",
          ],
          properties: {
            _id:              { bsonType: "string" },
            teacherId:        { bsonType: "string" },
            sectionId:        { bsonType: "string" },
            title:            { bsonType: "string", minLength: 1 },
            description:      { bsonType: "string" },
            timeLimitMinutes: { bsonType: "int", minimum: 1 },
            deadlineAt:       { bsonType: "date" },
            maxAttempts:      { bsonType: "int", minimum: 1 },
            maxScore:         { bsonType: "number", minimum: 0 },
            status: {
              bsonType: "string",
              enum: ["Draft", "Published", "Hidden", "Expired"],
            },
            questions: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["questionId", "content", "questionType", "answerOptions"],
                properties: {
                  questionId:   { bsonType: "string" },
                  content:      { bsonType: "string", minLength: 1 },
                  questionType: { bsonType: "string", enum: ["MultipleChoice"] },
                  answerOptions: {
                    bsonType: "array",
                    items: {
                      bsonType: "object",
                      required: ["optionId", "content", "isCorrect"],
                      properties: {
                        optionId:  { bsonType: "string" },
                        content:   { bsonType: "string", minLength: 1 },
                        isCorrect: { bsonType: "bool" },
                      },
                    },
                  },
                },
              },
            },
            hiddenReason: { bsonType: ["string", "null"] },
            createdAt:    { bsonType: "date" },
            updatedAt:    { bsonType: ["date", "null"] },
          },
        },
      },
      // validationLevel: "strict" — áp dụng validator cho cả insert lẫn update
      // validationAction: "error" — reject document vi phạm (không chỉ warn)
      validationLevel:  "strict",
      validationAction: "error",
    });

    console.log("✅ [Quiz] Collection 'quizzes' đã được tạo với JSON Schema validator.");
  } else {
    console.log("ℹ️  [Quiz] Collection 'quizzes' đã tồn tại, bỏ qua bước tạo.");
  }

  // Bước 2: Đồng bộ indexes từ Mongoose schema xuống MongoDB
  //
  // syncIndexes() thực hiện 3 việc:
  //   - Tạo index mới có trong schema nhưng chưa có trong DB
  //   - Drop index có trong DB nhưng không còn trong schema
  //   - Không đụng đến index _id (luôn giữ nguyên)
  //
  // Indexes được định nghĩa trong QuizModel (QuizSchema.index(...)):
  //   - { teacherId: 1, sectionId: 1 }   compound
  //   - { sectionId: 1, status: 1 }      compound
  //   - { deadlineAt: 1, status: 1 }     compound (cho ExpirationJob)
  //   - teacherId: 1                     single (khai báo inline trong schema)
  //   - sectionId: 1                     single (khai báo inline trong schema)
  //   - status: 1                        single (khai báo inline trong schema)

  await QuizModel.syncIndexes();
  console.log("✅ [Quiz] Indexes đã được đồng bộ.");

  console.log("🎉 [Quiz] Khởi tạo MongoDB hoàn tất.");
}

// Entrypoint khi chạy file trực tiếp bằng tsx
// Kiểm tra module có đang được chạy trực tiếp hay không
const isMain = process.argv[1]?.endsWith("init-mongo.ts") ||
               process.argv[1]?.endsWith("init-mongo.js");

if (isMain) {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("❌ Thiếu biến môi trường MONGO_URI.");
    process.exit(1);
  }

  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("✅ MongoDB connected.");
      await initQuizMongo();
      await mongoose.disconnect();
      console.log("👋 MongoDB disconnected.");
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("❌ Lỗi khi init MongoDB:", err);
      process.exit(1);
    });
}