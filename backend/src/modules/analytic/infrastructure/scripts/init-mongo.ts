import mongoose from "mongoose";
import { StudentQuizAnswerModel } from "../database/nosql/models/StudentQuizAnswerModel";
import { QuestionFailureRateModel } from "../database/nosql/models/QuestionFailureRateModel";

// Tại sao chỉ 2 trong 8 views dùng MongoDB? (còn lại dùng Oracle)
//   analytics_student_quiz_answers:
//     Data nested (answers array per attempt) — MongoDB document model
//     phù hợp hơn Oracle row. Không cần JOIN, load 1 lần toàn bộ attempt.
//
//   analytics_question_failure_rate:
//     Cần cộng dồn từng attempt (incremental upsert) trên nested array.
//     wrongOptionCounts là dynamic map (optionId → count) — MongoDB
//     Mixed type phù hợp hơn Oracle column với số lượng optionId không cố định.
//
// Cách chạy:
//   npx tsx src/modules/analytics/infrastructure/scripts/init-mongo.ts
//
// Hoặc gọi initAnalyticsMongo() từ server bootstrap trước khi start server.
export async function initAnalyticsMongo(): Promise<void> {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("initAnalyticsMongo: MongoDB chưa được connect.");
  }

  console.log("[Analytics] Bắt đầu khởi tạo MongoDB collections và indexes...");

  await initStudentQuizAnswers(db);
  await initQuestionFailureRate(db);

  console.log("[Analytics] Khởi tạo MongoDB hoàn tất.");
}

// analytics_student_quiz_answers 
//
// 1 document = 1 attempt đã finalized (Submitted hoặc Expired).
// _id = attemptId (string UUID) — unique per attempt.
//
// Student dùng để review chi tiết từng câu trả lời sau khi làm quiz.
async function initStudentQuizAnswers(
  db: NonNullable<(typeof mongoose.connection)["db"]>
): Promise<void> {
  const collectionName = "analytics_student_quiz_answers";

  const existing = await db.listCollections({ name: collectionName }).toArray();

  if (existing.length === 0) {
    await db.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: [
            "_id",
            "quizId",
            "studentId",
            "sectionId",
            "totalScore",
            "maxScore",
            "submittedAt",
            "attemptNumber",
            "status",
            "answers",
          ],
          properties: {
            // _id = attemptId — cùng với QuizAttempt MongoDB document
            _id:           { bsonType: "string" },
            quizId:        { bsonType: "string" },
            studentId:     { bsonType: "string" },
            sectionId:     { bsonType: "string" },
            totalScore:    { bsonType: "number", minimum: 0 },
            maxScore:      { bsonType: "number", minimum: 0 },
            submittedAt:   { bsonType: "date" },
            attemptNumber: { bsonType: "int",    minimum: 1 },
            status: {
              bsonType: "string",
              // Giữ đúng 2 giá trị từ domain event — không thêm InProgress
              // vì chỉ finalized attempts được project vào đây
              enum: ["SUBMITTED", "EXPIRED"],
            },
            answers: {
              bsonType: "array",
              // Mỗi attempt có ít nhất 1 câu hỏi
              minItems: 0,
              items: {
                bsonType: "object",
                required: [
                  "questionId",
                  "questionContent",
                  "selectedOptionIds",
                  "selectedOptionContents",
                  "correctOptionIds",
                  "correctOptionContents",
                  "isCorrect",
                  "earnedPoints",
                  "questionPoints",
                ],
                properties: {
                  questionId:             { bsonType: "string" },
                  questionContent:        { bsonType: "string" },
                  // Array of optionId strings — rỗng nếu student bỏ câu
                  selectedOptionIds: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                  },
                  selectedOptionContents: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                  },
                  correctOptionIds: {
                    bsonType: "array",
                    items:    { bsonType: "string" },
                    minItems: 1,   // quiz phải có ít nhất 1 correct option
                  },
                  correctOptionContents: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                  },
                  isCorrect:    { bsonType: "bool" },
                  earnedPoints: { bsonType: "number", minimum: 0 },
                  questionPoints: { bsonType: "number", minimum: 0 },
                },
              },
            },
          },
        },
      },
      validationLevel:  "strict",
      validationAction: "error",
    });

    console.log(`[Analytics] Collection '${collectionName}' đã được tạo với JSON Schema validator.`);
  } else {
    console.log(`[Analytics] Collection '${collectionName}' đã tồn tại, bỏ qua bước tạo.`);
  }

  // syncIndexes: đồng bộ index từ StudentQuizAnswerModel schema
  // Indexes được định nghĩa trong model:
  //   { studentId: 1, sectionId: 1 }  — Student xem danh sách attempts trong section
  //   { quizId: 1, studentId: 1 }     — load result theo quiz + student
  await StudentQuizAnswerModel.syncIndexes();
  console.log(`[Analytics] Indexes '${collectionName}' đã được đồng bộ.`);
}

// analytics_question_failure_rate 
//
// 1 document = 1 (quizId, sectionId) combination.
// _id = "{quizId}_{sectionId}" — composite string key.
//
// Mỗi document chứa 1 mảng questions, mỗi question tích lũy:
//   - totalQuestionAttempts, correctAnswers, wrongAnswers, unansweredCount
//   - wrongOptionCounts: Record<optionId, count> — frequency map để tính
//     mostSelectedWrongOptionId chính xác theo tần suất
//   - failureRate = wrongAnswers / totalQuestionAttempts
//
// processedAttemptIds: danh sách attemptId đã được xử lý —
// dùng để đảm bảo idempotency khi event được fire lại.
//
// wrongOptionCounts là dynamic object (Mixed type) — không thể validate
// chi tiết từng key bằng JSON Schema. Chỉ validate bsonType là "object".
// Logic integrity được đảm bảo bởi Projector.
async function initQuestionFailureRate(
  db: NonNullable<(typeof mongoose.connection)["db"]>
): Promise<void> {
  const collectionName = "analytics_question_failure_rate";

  const existing = await db.listCollections({ name: collectionName }).toArray();

  if (existing.length === 0) {
    await db.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: [
            "_id",
            "quizId",
            "sectionId",
            "quizTitle",
            "sectionName",
            "totalSubmittedAttempts",
            "lastUpdatedAt",
            "questions",
            "processedAttemptIds",
          ],
          properties: {
            // _id = "{quizId}_{sectionId}" composite string
            _id:                    { bsonType: "string" },
            quizId:                 { bsonType: "string" },
            sectionId:              { bsonType: "string" },
            quizTitle:              { bsonType: "string" },
            sectionName:            { bsonType: "string" },
            totalSubmittedAttempts: { bsonType: "int",  minimum: 0 },
            lastUpdatedAt:          { bsonType: "date" },
            // processedAttemptIds: idempotency guard
            // — danh sách attemptId đã được xử lý
            processedAttemptIds: {
              bsonType: "array",
              items: { bsonType: "string" },
            },
            questions: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: [
                  "questionId",
                  "questionContent",
                  "totalQuestionAttempts",
                  "correctAnswers",
                  "wrongAnswers",
                  "unansweredCount",
                  "failureRate",
                  "wrongOptionCounts",
                ],
                properties: {
                  questionId:      { bsonType: "string" },
                  questionContent: { bsonType: "string" },
                  totalQuestionAttempts: { bsonType: "int", minimum: 0 },
                  correctAnswers:        { bsonType: "int", minimum: 0 },
                  wrongAnswers:          { bsonType: "int", minimum: 0 },
                  unansweredCount:       { bsonType: "int", minimum: 0 },
                  failureRate:           { bsonType: "number", minimum: 0, maximum: 1 },
                  // Dynamic map: optionId → count — Mixed type, không validate chi tiết
                  wrongOptionCounts: { bsonType: "object" },
                  // null khi chưa có answer sai nào
                  mostSelectedWrongOptionId: {
                    bsonType: ["string", "null"],
                  },
                  mostSelectedWrongOptionContent: {
                    bsonType: ["string", "null"],
                  },
                },
              },
            },
          },
        },
      },
      validationLevel:  "strict",
      validationAction: "error",
    });

    console.log(`[Analytics] Collection '${collectionName}' đã được tạo với JSON Schema validator.`);
  } else {
    console.log(`[Analytics] Collection '${collectionName}' đã tồn tại, bỏ qua bước tạo.`);
  }

  // syncIndexes: đồng bộ index từ QuestionFailureRateModel schema
  // Indexes được định nghĩa trong model:
  //   { quizId: 1, sectionId: 1 }  — Teacher xem failure rate theo quiz/section
  await QuestionFailureRateModel.syncIndexes();
  console.log(`[Analytics] Indexes '${collectionName}' đã được đồng bộ.`);
}

// Entrypoint khi chạy file trực tiếp 
//
// Chạy: npx tsx src/modules/analytics/infrastructure/scripts/init-mongo.ts
// Biến môi trường: MONGO_URI (bắt buộc)
const isMain =
  process.argv[1]?.endsWith("init-mongo.ts") ||
  process.argv[1]?.endsWith("init-mongo.js");

if (isMain) {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("[Analytics] Thiếu biến môi trường MONGO_URI.");
    process.exit(1);
  }

  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("[Analytics] MongoDB connected.");
      await initAnalyticsMongo();
      await mongoose.disconnect();
      console.log("[Analytics] MongoDB disconnected.");
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("[Analytics] Lỗi khi init MongoDB:", err);
      process.exit(1);
    });
}