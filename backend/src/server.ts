import "dotenv/config";
import { EventEmitter } from "events";
import app              from "./app";

// Config — DB connections
import { connectMongo }              from "./config/mongodb";
import { connectOracle }             from "./config/oracle";
import { connectRedis, redisClient } from "./config/redis";
import { createSwaggerRouter }       from "./docs/swagger";

// MongoDB init scripts — tạo collections + indexes cho từng Context
import { initQuizMongo }        from "./modules/quiz/infrastructure/scripts/init-mongo";
import { initQuizAttemptMongo } from "./modules/quiz-attempt/infrastructure/scripts/init-mongo";
import { initAnalyticsMongo }   from "./modules/analytic/infrastructure/scripts/init-mongo";

// Identity Context
import {
  createTokenProvider,
  createAuthorizationUseCase,
  PermissionType,
} from "./modules/identity";
import { createAuthRouter } from "./modules/identity/presentation/routes/auth.routes";

// Academic Context 
import { createAcademicRouter } from "./modules/academic/presentation/routes/academic.routes";

// Quiz Context 
import { createQuizExpirationJob } from "./modules/quiz";
import { createQuizRouter }        from "./modules/quiz/presentation/routes/quiz.routes";

// Quiz Attempt Context 
import { createAttemptExpirationJob } from "./modules/quiz-attempt";
import { createAttemptRouter }        from "./modules/quiz-attempt/presentation/routes/attempt.routes";

// Analytics Context
import {
  createAnalyticsRouter,
  createAnalyticsEventSubscriber,
  AnalyticsEventSubscriber,
} from "./modules/analytic";

// Shared middlewares 
import { requireAuthentication } from "./shared/middlewares/requireAuthentication";
import { requireRole }           from "./shared/middlewares/requireRole";

// Bootstrap
const startServer = async (): Promise<void> => {

  // 1. Kết nối databases 
  await connectMongo();
  const oracleConnection = await connectOracle();
  await connectRedis();

  // 2. Khởi tạo MongoDB collections + indexes ─
  // Chạy sau connectMongo() thành công. Idempotent — chạy lại không lỗi.
  await initQuizMongo();
  await initQuizAttemptMongo();
  await initAnalyticsMongo();

  // 3. EventEmitter dùng chung toàn Modular Monolith
  // setMaxListeners(20): tránh warning khi nhiều Context cùng subscribe
  const eventEmitter = new EventEmitter();
  eventEmitter.setMaxListeners(20);

  // 4. Identity — shared middleware factories 
  const tokenProvider        = createTokenProvider(redisClient);
  const authorizationUseCase = createAuthorizationUseCase(oracleConnection);

  const authenticate = requireAuthentication(tokenProvider);
  const authorize    = (permission: PermissionType) =>
    requireRole(authorizationUseCase, permission);

  // 5. Analytics Event Subscriber
  // Đăng ký TRƯỚC khi mount routes để không bỏ sót event nào.
  const analyticsSubscriber: AnalyticsEventSubscriber =
    createAnalyticsEventSubscriber(eventEmitter, oracleConnection, redisClient);
  analyticsSubscriber.register();

  // 6. Background Jobs 
  const quizExpirationJob    = createQuizExpirationJob(eventEmitter, 60_000);
  const attemptExpirationJob = createAttemptExpirationJob(eventEmitter, 60_000);

  quizExpirationJob.start();
  attemptExpirationJob.start();

  // 7. Mount routes 
  // Health check — không cần auth
  app.get("/", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Identity Context — login / logout / reset-password
  app.use(createSwaggerRouter());
  app.use("/auth", createAuthRouter(oracleConnection, redisClient));

  // Academic Context — Teacher/Student dashboard sections
  app.use(
    "/academic",
    createAcademicRouter(
      oracleConnection,
      authenticate,
      authorize(PermissionType.VIEW_SECTION),
    ),
  );

  // Quiz Context — Teacher quản lý quiz
  // Routes tự prefix /quizzes và /sections bên trong createQuizRouter
  app.use(
    "/",
    createQuizRouter(
      oracleConnection,
      eventEmitter,
      authenticate,
      authorize(PermissionType.CREATE_QUIZ),
      authorize(PermissionType.ATTEMPT_QUIZ),
      redisClient,
    ),
  );

  // Quiz Attempt Context — Student làm bài
  // Routes tự prefix /quizzes/:id/attempts và /attempts/:id/... bên trong
  app.use(
    "/",
    createAttemptRouter(
      oracleConnection,
      eventEmitter,
      authenticate,
      authorize(PermissionType.ATTEMPT_QUIZ),
    ),
  );

  // Analytics Context — read models cho Teacher / Student / Admin
  app.use(
    "/analytics",
    createAnalyticsRouter(
      oracleConnection,
      redisClient,
      authenticate,
      authorize(PermissionType.VIEW_ANALYTICS),
      authorize(PermissionType.VIEW_AT_RISK_STUDENTS),
      authorize(PermissionType.VIEW_OWN_RESULT),
      authorize(PermissionType.VIEW_CLASS_RANKING),
      authorize(PermissionType.VIEW_HIERARCHICAL_REPORT),
    ),
  );

  // 8. Start HTTP server
  const PORT   = Number(process.env.PORT) || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // 9. Graceful shutdown
  // Thứ tự: ngừng HTTP → dừng jobs → unregister listeners → đóng DB
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Shutdown] Nhận tín hiệu ${signal}. Bắt đầu graceful shutdown...`);

    server.close(() => {
      console.log("[Shutdown] HTTP server đã đóng.");
    });

    quizExpirationJob.stop();
    attemptExpirationJob.stop();
    analyticsSubscriber.unregister();

    try {
      await redisClient.quit();
      console.log("[Shutdown] Redis disconnected.");
    } catch (err) {
      console.error("[Shutdown] Lỗi khi đóng Redis:", err);
    }

    try {
      await oracleConnection.close();
      console.log("[Shutdown] Oracle disconnected.");
    } catch (err) {
      console.error("[Shutdown] Lỗi khi đóng Oracle:", err);
    }

    const mongoose = await import("mongoose");
    try {
      await mongoose.default.disconnect();
      console.log("[Shutdown] MongoDB disconnected.");
    } catch (err) {
      console.error("[Shutdown] Lỗi khi đóng MongoDB:", err);
    }

    console.log("[Shutdown] Hoàn tất. Thoát process.");
    process.exit(0);
  };

  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT",  () => { void shutdown("SIGINT");  });

  process.on("unhandledRejection", (reason) => {
    console.error("[Process] Unhandled Promise Rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[Process] Uncaught Exception:", err);
    void shutdown("uncaughtException");
  });
};

startServer().catch((err) => {
  console.error("Server khởi động thất bại:", err);
  process.exit(1);
});
