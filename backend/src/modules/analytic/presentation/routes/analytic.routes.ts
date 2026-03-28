import { Router, RequestHandler } from "express";
import oracledb                   from "oracledb";

// Infrastructure — Oracle
import { OracleAnalyticsRepository }  from "../../infrastructure/database/sql/repositories/OracleAnalyticsRepository";

// Infrastructure — MongoDB 
import { MongoAnalyticsRepository }   from "../../infrastructure/database/nosql/repositories/MongoAnalyticsRepository";
import { StudentQuizAnswerModel }      from "../../infrastructure/database/nosql/models/StudentQuizAnswerModel";
import { QuestionFailureRateModel }    from "../../infrastructure/database/nosql/models/QuestionFailureRateModel";

// Cross-context — Academic 
import { createAcademicQueryService } from "../../../academic";

// Application — Queries
import { QuizPerformanceQuery }     from "../../application/queries/QuizPerformanceQuery";
import { StudentQuizResultQuery }   from "../../application/queries/StudentQuizResultQuery";
import { AtRiskStudentQuery }      from "../../application/queries/AtRiskStudentQuery";
import { StudentClassRankingQuery } from "../../application/queries/StudentClassRankingQuery";
import { ScoreDistributionQuery }   from "../../application/queries/ScoreDistributionQuery";
import { HierarchicalQuizReportQuery }  from "../../application/queries/HierarchicalQuizReportQuery";
import { StudentQuizAnswerQuery }        from "../../application/queries/StudentQuizAnswerQuery";
import { QuestionFailureRateQuery } from "../../application/queries/QuestionFailureRateQuery";

// Presentation — Controllers
import { TeacherAnalyticsController } from "../../presentation/controllers/TeacherAnalyticsController";
import { StudentAnalyticsController } from "../../presentation/controllers/StudentAnalyticsController";
import { AdminAnalyticsController }   from "../../presentation/controllers/AdminAnalyticsController";

// DI được wire thủ công theo pattern của project:
//   Infrastructure (Repository)
//     → Application (Query)
//       → Presentation (Controller)
//         → Route
//
// Nhận từ bên ngoài (server.ts):
//   oracleConnection          — dùng chung, không tạo mới mỗi request
//   authenticate              — requireAuthentication middleware (verify JWT)
//   authorizeViewAnalytics    — requireRole(VIEW_ANALYTICS)         Teacher + Admin
//   authorizeViewAtRisk       — requireRole(VIEW_AT_RISK_STUDENTS)  Teacher + Admin
//   authorizeViewOwnResult    — requireRole(VIEW_OWN_RESULT)        Student + Teacher
//   authorizeViewClassRanking — requireRole(VIEW_CLASS_RANKING)     Student + Teacher + Admin
//   authorizeViewHierarchical — requireRole(VIEW_HIERARCHICAL_REPORT) Admin
//
// Route prefix: /analytics  (mount ở server.ts)
//
// Route structure:
//   Teacher routes:
//     GET /analytics/sections/:sectionId/performance
//     GET /analytics/sections/:sectionId/quizzes/:quizId/performance
//     GET /analytics/sections/:sectionId/at-risk
//     GET /analytics/sections/:sectionId/quizzes/:quizId/score-distribution
//     GET /analytics/sections/:sectionId/quizzes/:quizId/question-failure-rate
//
//   Student routes:
//     GET /analytics/sections/:sectionId/my-results
//     GET /analytics/quizzes/:quizId/my-results
//     GET /analytics/attempts/:attemptId/answer-review
//     GET /analytics/quizzes/:quizId/my-answer-history
//     GET /analytics/sections/:sectionId/my-ranking
//
//   Admin routes:
//     GET /analytics/hierarchical-report
//     GET /analytics/hierarchical-report/tree
//     GET /analytics/hierarchical-report/summary
//     GET /analytics/hierarchical-report/faculty/:facultyId
//     GET /analytics/hierarchical-report/course/:courseId
//     GET /analytics/sections/:sectionId/quizzes/:quizId/score-distribution  (shared với Teacher)
export function createAnalyticsRouter(
  oracleConnection:           oracledb.Connection,
  authenticate:               RequestHandler,
  authorizeViewAnalytics:     RequestHandler,
  authorizeViewAtRisk:        RequestHandler,
  authorizeViewOwnResult:     RequestHandler,
  authorizeViewClassRanking:  RequestHandler,
  authorizeViewHierarchical:  RequestHandler,
): Router {
  const router = Router();

  // Infrastructure 
  const oracleRepo = new OracleAnalyticsRepository(oracleConnection);

  // MongoAnalyticsRepository nhận Model qua constructor (dễ mock khi test)
  // Model đã bind vào Mongoose global connection từ server.ts bootstrap.
  const mongoRepo  = new MongoAnalyticsRepository(
    StudentQuizAnswerModel,
    QuestionFailureRateModel,
  );

  // Academic Context — dùng chung cho Query cần verify section assignment
  const academicService = createAcademicQueryService(oracleConnection);

  // Application: Queries 
  const quizPerformanceQuery     = new QuizPerformanceQuery(oracleRepo, academicService);
  const studentQuizResultQuery   = new StudentQuizResultQuery(oracleRepo);
  const atRiskStudentQuery       = new AtRiskStudentQuery(oracleRepo, academicService);
  const studentClassRankingQuery = new StudentClassRankingQuery(oracleRepo);
  const scoreDistributionQuery   = new ScoreDistributionQuery(oracleRepo, academicService);
  const hierarchicalReportQuery  = new HierarchicalQuizReportQuery(oracleRepo);
  const studentQuizAnswerQuery   = new StudentQuizAnswerQuery(mongoRepo);
  const questionFailureRateQuery = new QuestionFailureRateQuery(mongoRepo, academicService);
 
  // Presentation: Controllers 
  const teacherController = new TeacherAnalyticsController(
    quizPerformanceQuery,
    atRiskStudentQuery,
    scoreDistributionQuery,
    questionFailureRateQuery,
  );
 
  const studentController = new StudentAnalyticsController(
    studentQuizResultQuery,
    studentQuizAnswerQuery,
    studentClassRankingQuery,
  );
 
  const adminController = new AdminAnalyticsController(
    hierarchicalReportQuery
  );

  // Routes 
  // Teacher routes — VIEW_ANALYTICS
  router.get(
    "/sections/:sectionId/performance",
    authenticate, authorizeViewAnalytics,
    teacherController.getSectionPerformance.bind(teacherController),
  );
  router.get(
    "/sections/:sectionId/quizzes/:quizId/performance",
    authenticate, authorizeViewAnalytics,
    teacherController.getQuizPerformance.bind(teacherController),
  );
  router.get(
    "/sections/:sectionId/quizzes/:quizId/question-failure-rate",
    authenticate, authorizeViewAnalytics,
    teacherController.getQuestionFailureRate.bind(teacherController),
  );

  // Teacher routes — VIEW_AT_RISK_STUDENTS
  router.get(
    "/sections/:sectionId/at-risk",
    authenticate, authorizeViewAtRisk,
    teacherController.getAtRiskStudents.bind(teacherController),
  );

  // Shared route: Teacher + Admin — VIEW_ANALYTICS
  // 1 route duy nhất — Controller đọc req.user.roleName để xác định actorRole.
  // Teacher → ScoreDistributionQuery.execute(actorId, "TEACHER", ...) → verify section assignment
  // Admin   → ScoreDistributionQuery.execute(actorId, "ADMIN", ...)  → không cần verify
  router.get(
    "/sections/:sectionId/quizzes/:quizId/score-distribution",
    authenticate, authorizeViewAnalytics,
    teacherController.getScoreDistribution.bind(teacherController),
  );

  // Student routes — VIEW_OWN_RESULT
  router.get(
    "/sections/:sectionId/my-results",
    authenticate, authorizeViewOwnResult,
    studentController.getResultsBySection.bind(studentController),
  );
  router.get(
    "/quizzes/:quizId/my-results",
    authenticate, authorizeViewOwnResult,
    studentController.getResultsByQuiz.bind(studentController),
  );
  router.get(
    "/attempts/:attemptId/answer-review",
    authenticate, authorizeViewOwnResult,
    studentController.getAnswerReview.bind(studentController),
  );
  router.get(
    "/quizzes/:quizId/my-answer-history",
    authenticate, authorizeViewOwnResult,
    studentController.getAnswerHistoryByQuiz.bind(studentController),
  );

  // Student routes — VIEW_CLASS_RANKING
  router.get(
    "/sections/:sectionId/my-ranking",
    authenticate, authorizeViewClassRanking,
    studentController.getMyRanking.bind(studentController),
  );

  // Admin routes — VIEW_HIERARCHICAL_REPORT
  // Lưu ý thứ tự: route cụ thể (/tree, /summary, /faculty/:id, /course/:id)
  // phải đứng TRƯỚC route tổng quát (/) để Express không nhầm "tree" là facultyId.
  router.get(
    "/hierarchical-report/tree",
    authenticate, authorizeViewHierarchical,
    adminController.getReportTree.bind(adminController),
  );
  router.get(
    "/hierarchical-report/summary",
    authenticate, authorizeViewHierarchical,
    adminController.getReportSummary.bind(adminController),
  );
  router.get(
    "/hierarchical-report/faculty/:facultyId",
    authenticate, authorizeViewHierarchical,
    adminController.getReportByFaculty.bind(adminController),
  );
  router.get(
    "/hierarchical-report/course/:courseId",
    authenticate, authorizeViewHierarchical,
    adminController.getReportByCourse.bind(adminController),
  );
  router.get(
    "/hierarchical-report",
    authenticate, authorizeViewHierarchical,
    adminController.getFullReport.bind(adminController),
  );

  return router;
}