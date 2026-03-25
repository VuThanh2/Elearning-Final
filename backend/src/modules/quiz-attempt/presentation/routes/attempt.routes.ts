import { Router, RequestHandler } from "express";
import { EventEmitter }           from "events";
import oracledb                   from "oracledb";

// Cross-context imports — CHỈ qua entry point (index.ts), không import sâu vào bên trong
import { createAcademicQueryService } from "../../../academic";
import { createQuizQueryService }     from "../../../quiz";

// Infrastructure — Quiz Attempt Context
import { QuizAttemptModel }          from "../../infrastructure/models/QuizAttemptModel";
import { QuizAttemptRepository }     from "../../infrastructure/repositories/QuizAttemptRepository";
import { SystemDateTimeProvider }    from "../../infrastructure/providers/DateTimeProvider";
import { AttemptEventEmitterProvider } from "../../infrastructure/providers/AttemptEventEmitterProvider";

// Application — Use Cases
import { StartQuizAttemptUseCase }  from "../../application/use-cases/StartQuizAttemptUseCase";
import { SubmitQuizAttemptUseCase } from "../../application/use-cases/SubmitQuizAttemptUseCase";
import { ExpireQuizAttemptUseCase } from "../../application/use-cases/ExpireQuizAttemptUseCase";

// Presentation
import { QuizAttemptController } from "../../presentation/controllers/QuizAttemptController";

// DI (Dependency Injection) được wire thủ công theo pattern của project:
//   Infrastructure (Repository, Provider)
//     → Application (Use Case)
//       → Presentation (Controller)
//         → Route
//
// Nhận từ bên ngoài (server.ts):
//   oracleConnection — dùng chung, không tạo mới mỗi request
//   eventEmitter     — dùng chung toàn bộ Modular Monolith
//   authenticate     — requireAuthentication middleware (verify JWT)
//   authorizeAttemptQuiz — requireRole(ATTEMPT_QUIZ) middleware
//                          cả Student lẫn Teacher đều có permission này (theo seed.sql)
//
// Quiz Attempt Context KHÔNG cần nhận oracleConnection để tự tạo repo
// vì nó dùng MongoDB qua Mongoose — QuizAttemptModel đã bind vào
// Mongoose global connection khi server bootstrap gọi mongoose.connect().
// Oracle chỉ cần để tạo academicQueryService (check enrollment qua Oracle).
//
// Route structure:
//   POST /quizzes/:quizId/attempts          — start attempt
//   POST /attempts/:attemptId/submit        — student nộp bài chủ động
//   POST /attempts/:attemptId/expire        — frontend auto-submit khi hết giờ

export function createAttemptRouter(
  oracleConnection:     oracledb.Connection,
  eventEmitter:         EventEmitter,
  authenticate:         RequestHandler,
  authorizeAttemptQuiz: RequestHandler,
): Router {
  const router = Router();

  // Cross-context Services
  // Academic Context: check enrollment (Oracle)
  const academicService  = createAcademicQueryService(oracleConnection);

  // Quiz Context: get quiz snapshot + grading data + student view (MongoDB)
  // createQuizQueryService() không cần connection — dùng Mongoose global
  const quizQueryService = createQuizQueryService();

  // Quiz Attempt Context Infrastructure 
  const attemptRepository = new QuizAttemptRepository(QuizAttemptModel);
  const dateTimeProvider  = new SystemDateTimeProvider();
  const eventPublisher    = new AttemptEventEmitterProvider(eventEmitter);

  // Use Cases 
  const startAttemptUseCase = new StartQuizAttemptUseCase(
    attemptRepository,
    academicService,
    quizQueryService,
    dateTimeProvider,
    eventPublisher,
  );

  const submitAttemptUseCase = new SubmitQuizAttemptUseCase(
    attemptRepository,
    quizQueryService,
    dateTimeProvider,
    eventPublisher,
  );

  const expireAttemptUseCase = new ExpireQuizAttemptUseCase(
    attemptRepository,
    quizQueryService,
    dateTimeProvider,
    eventPublisher,
  );

  // Controller 
  const controller = new QuizAttemptController(
    startAttemptUseCase,
    submitAttemptUseCase,
    expireAttemptUseCase,
  );

  // Routes 
  //
  // POST /quizzes/:quizId/attempts
  //   Student bắt đầu làm quiz — tạo attempt mới (InProgress)
  //   Permission: ATTEMPT_QUIZ (Student + Teacher đều có)
  //   Response 201: StartAttemptResponseDTO
  router.post(
    "/quizzes/:quizId/attempts",
    authenticate,
    authorizeAttemptQuiz,
    controller.startAttempt.bind(controller),
  );

  // POST /attempts/:attemptId/submit
  //   Student nộp bài chủ động — chấm điểm, status → Submitted
  //   Permission: ATTEMPT_QUIZ (dùng chung, không cần permission riêng)
  //   Response 200: FinalizeAttemptResponseDTO
  router.post(
    "/attempts/:attemptId/submit",
    authenticate,
    authorizeAttemptQuiz,
    controller.submitAttempt.bind(controller),
  );

  // POST /attempts/:attemptId/expire
  //   Frontend auto-submit khi detect hết giờ — chấm điểm, status → Expired
  //   Idempotent: gọi 2 lần vẫn trả 200 bình thường
  //   Permission: ATTEMPT_QUIZ (dùng chung)
  //   Response 200: FinalizeAttemptResponseDTO
  router.post(
    "/attempts/:attemptId/expire",
    authenticate,
    authorizeAttemptQuiz,
    controller.expireAttempt.bind(controller),
  );

  return router;
}