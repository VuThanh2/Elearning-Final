import { Router, RequestHandler } from "express";
import { EventEmitter }           from "events";
import oracledb                   from "oracledb";

// Infrastructure
import { QuizModel }              from "../../infrastructure/models/QuizModel";
import { QuizRepository }         from "../../infrastructure/repositories/QuizRepository";
import { SystemDateTimeProvider } from "../../infrastructure/providers/SystemDateTimeProvider";
import { EventEmitterProvider }   from "../../infrastructure/providers/EventEmitterProvider";

// Cross-context — AcademicIntegrationProvider 
// NOTE: nếu sau này cần tách microservice, move sang shared/ hoặc dùng HTTP client
import { AcademicIntegrationProvider } from "../../../academic/infrastructure/providers/AcademicIntegrationProvider";

// Application — Use Cases
import { CreateQuizUseCase }     from "../../application/use-cases/CreateQuizUseCase";
import { UpdateQuizUseCase }     from "../../application/use-cases/UpdateQuizUseCase";
import { UpdateDeadlineUseCase } from "../../application/use-cases/UpdateDeadlineUseCase";
import { PublishQuizUseCase }    from "../../application/use-cases/PublishQuizUseCase";
import { HideQuizUseCase }       from "../../application/use-cases/HideQuizUseCase";
import { GetQuizUseCase, GetQuizListUseCase } from "../../application/use-cases/QuizQueryUseCase";
import { AddQuestionUseCase, RemoveQuestionUseCase, UpdateQuestionUseCase } from "../../application/use-cases/QuestionUseCase";
import { AddAnswerOptionUseCase, RemoveAnswerOptionUseCase, UpdateAnswerOptionUseCase } from "../../application/use-cases/AnswerOptionUseCase";

// Presentation
import { QuizController }         from "../../presentation/controllers/QuizController";
import { QuizQuestionController } from "../../presentation/controllers/QuizQuestionController";

// Tham số:
//   oracleConnection — Oracle connection cho AcademicIntegrationProvider
//   eventEmitter     — Shared EventEmitter (phải dùng chung 1 instance từ server bootstrap để Analytics nhận được event)
//   authenticate     — Middleware xác thực JWT, đã được wire ở server.ts từ Identity Context (JwtTokenProvider + Redis)
//   authorizeTeacher — Middleware phân quyền Teacher, đã được wire ở server.ts từ Identity Context (AuthorizationUseCase + PermissionType)
//
// Quiz module không biết Identity dùng JWT hay session, không biết
// UserRepository hay JwtTokenProvider — chỉ nhận middleware đã sẵn sàng.
// Việc wire authenticate/authorizeTeacher nằm ở server.ts — nơi có quyền biết về tất cả modules.

export function createQuizRouter(
  oracleConnection:  oracledb.Connection,
  eventEmitter:      EventEmitter,
  authenticate:      RequestHandler,
  authorizeTeacher:  RequestHandler,
): Router {
  const router = Router();

  // Infrastructure layer
  const quizRepository   = new QuizRepository(QuizModel);
  const academicProvider = new AcademicIntegrationProvider(oracleConnection);
  const dateTimeProvider = new SystemDateTimeProvider();
  const eventPublisher   = new EventEmitterProvider(eventEmitter);

  // Application layer — Use Cases
  const createQuizUseCase     = new CreateQuizUseCase(quizRepository, academicProvider, dateTimeProvider, eventPublisher);
  const updateQuizUseCase     = new UpdateQuizUseCase(quizRepository, dateTimeProvider);
  const updateDeadlineUseCase = new UpdateDeadlineUseCase(quizRepository, dateTimeProvider);
  const publishQuizUseCase    = new PublishQuizUseCase(quizRepository, dateTimeProvider, eventPublisher);
  const hideQuizUseCase       = new HideQuizUseCase(quizRepository, dateTimeProvider, eventPublisher);
  const getQuizUseCase        = new GetQuizUseCase(quizRepository);
  const getQuizListUseCase    = new GetQuizListUseCase(quizRepository);

  const addQuestionUseCase    = new AddQuestionUseCase(quizRepository, dateTimeProvider);
  const removeQuestionUseCase = new RemoveQuestionUseCase(quizRepository, dateTimeProvider);
  const updateQuestionUseCase = new UpdateQuestionUseCase(quizRepository, dateTimeProvider);

  const addAnswerOptionUseCase    = new AddAnswerOptionUseCase(quizRepository, dateTimeProvider);
  const removeAnswerOptionUseCase = new RemoveAnswerOptionUseCase(quizRepository, dateTimeProvider);
  const updateAnswerOptionUseCase = new UpdateAnswerOptionUseCase(quizRepository, dateTimeProvider);

  // Presentation layer — Controllers
  const quizController = new QuizController(
    createQuizUseCase,
    updateQuizUseCase,
    updateDeadlineUseCase,
    publishQuizUseCase,
    hideQuizUseCase,
    getQuizUseCase,
    getQuizListUseCase,
  );

  const quizQuestionController = new QuizQuestionController(
    addQuestionUseCase,
    removeQuestionUseCase,
    updateQuestionUseCase,
    addAnswerOptionUseCase,
    removeAnswerOptionUseCase,
    updateAnswerOptionUseCase,
  );

  // Tất cả routes đều phải qua authenticate + authorizeTeacher.
  //
  // Route structure:
  //   /quizzes                                       — quiz CRUD
  //   /quizzes/:quizId/questions                     — question CRUD
  //   /quizzes/:quizId/questions/:questionId/options — option CRUD
  //   /sections/:sectionId/quizzes                   — list quiz theo section

  //Quiz 
  router.post(   "/quizzes",                    authenticate, authorizeTeacher, quizController.createQuiz.bind(quizController));
  router.get(    "/quizzes/:quizId",            authenticate, authorizeTeacher, quizController.getQuiz.bind(quizController));
  router.patch(  "/quizzes/:quizId",            authenticate, authorizeTeacher, quizController.updateQuiz.bind(quizController));
  router.patch(  "/quizzes/:quizId/deadline",   authenticate, authorizeTeacher, quizController.updateDeadline.bind(quizController));
  router.post(   "/quizzes/:quizId/publish",    authenticate, authorizeTeacher, quizController.publishQuiz.bind(quizController));
  router.post(   "/quizzes/:quizId/hide",       authenticate, authorizeTeacher, quizController.hideQuiz.bind(quizController));
  router.get(    "/sections/:sectionId/quizzes",authenticate, authorizeTeacher, quizController.getQuizList.bind(quizController));

  //Question 
  router.post(   "/quizzes/:quizId/questions",                              authenticate, authorizeTeacher, quizQuestionController.addQuestion.bind(quizQuestionController));
  router.delete( "/quizzes/:quizId/questions/:questionId",                  authenticate, authorizeTeacher, quizQuestionController.removeQuestion.bind(quizQuestionController));
  router.patch(  "/quizzes/:quizId/questions/:questionId",                  authenticate, authorizeTeacher, quizQuestionController.updateQuestion.bind(quizQuestionController));

  //AnswerOption 
  router.post(   "/quizzes/:quizId/questions/:questionId/options",          authenticate, authorizeTeacher, quizQuestionController.addAnswerOption.bind(quizQuestionController));
  router.delete( "/quizzes/:quizId/questions/:questionId/options/:optionId", authenticate, authorizeTeacher, quizQuestionController.removeAnswerOption.bind(quizQuestionController));
  router.patch(  "/quizzes/:quizId/questions/:questionId/options/:optionId", authenticate, authorizeTeacher, quizQuestionController.updateAnswerOption.bind(quizQuestionController));

  return router;
}