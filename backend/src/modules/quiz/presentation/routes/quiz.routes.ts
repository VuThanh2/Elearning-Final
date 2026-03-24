import { Router, RequestHandler }    from "express";
import { EventEmitter }              from "events";
import oracledb                      from "oracledb";

// Academic Context — chỉ import từ entry point (index.ts)
// Không import thẳng vào bất kỳ file nào bên trong Academic
import { createAcademicQueryService } from "../../../academic";

// Infrastructure
import { QuizModel }                 from "../../infrastructure/models/QuizModel";
import { QuizRepository }            from "../../infrastructure/repositories/QuizRepository";
import { SystemDateTimeProvider }    from "../../infrastructure/providers/SystemDateTimeProvider";
import { EventEmitterProvider }      from "../../infrastructure/providers/EventEmitterProvider";

// Use Cases
import { CreateQuizUseCase }         from "../../application/use-cases/CreateQuizUseCase";
import { UpdateQuizUseCase }         from "../../application/use-cases/UpdateQuizUseCase";
import { UpdateDeadlineUseCase }     from "../../application/use-cases/UpdateDeadlineUseCase";
import { PublishQuizUseCase }        from "../../application/use-cases/PublishQuizUseCase";
import { HideQuizUseCase }           from "../../application/use-cases/HideQuizUseCase";
import { GetQuizUseCase, GetQuizListUseCase } from "../../application/use-cases/QuizQueryUseCase";
import { AddQuestionUseCase, RemoveQuestionUseCase, UpdateQuestionUseCase } from "../../application/use-cases/QuestionUseCase";
import { AddAnswerOptionUseCase, RemoveAnswerOptionUseCase, UpdateAnswerOptionUseCase } from "../../application/use-cases/AnswerOptionUseCase";

// Presentation
import { QuizController }            from "../../presentation/controllers/QuizController";
import { QuizQuestionController }    from "../../presentation/controllers/QuizQuestionController";

export function createQuizRouter(
  oracleConnection: oracledb.Connection,
  eventEmitter:     EventEmitter,
  authenticate:     RequestHandler,
  authorizeTeacher: RequestHandler,
): Router {
  const router = Router();

  // Academic Context
  const academicService  = createAcademicQueryService(oracleConnection);

  // Quiz Context Infrastructure
  const quizRepository   = new QuizRepository(QuizModel);
  const dateTimeProvider = new SystemDateTimeProvider();
  const eventPublisher   = new EventEmitterProvider(eventEmitter);

  // Use Cases
  const createQuizUseCase     = new CreateQuizUseCase(quizRepository, academicService, dateTimeProvider, eventPublisher);
  const updateQuizUseCase     = new UpdateQuizUseCase(quizRepository, dateTimeProvider);
  const updateDeadlineUseCase = new UpdateDeadlineUseCase(quizRepository, dateTimeProvider);
  const publishQuizUseCase    = new PublishQuizUseCase(quizRepository, dateTimeProvider, eventPublisher);
  const hideQuizUseCase       = new HideQuizUseCase(quizRepository, dateTimeProvider, eventPublisher);
  const getQuizUseCase        = new GetQuizUseCase(quizRepository);
  const getQuizListUseCase    = new GetQuizListUseCase(quizRepository);

  const addQuestionUseCase        = new AddQuestionUseCase(quizRepository, dateTimeProvider);
  const removeQuestionUseCase     = new RemoveQuestionUseCase(quizRepository, dateTimeProvider);
  const updateQuestionUseCase     = new UpdateQuestionUseCase(quizRepository, dateTimeProvider);
  const addAnswerOptionUseCase    = new AddAnswerOptionUseCase(quizRepository, dateTimeProvider);
  const removeAnswerOptionUseCase = new RemoveAnswerOptionUseCase(quizRepository, dateTimeProvider);
  const updateAnswerOptionUseCase = new UpdateAnswerOptionUseCase(quizRepository, dateTimeProvider);

  // Controllers 
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

  // Routes
  // Tất cả routes đều phải qua authenticate + authorizeTeacher.
  //
  // Route structure:
  //   /quizzes                                       — quiz CRUD
  //   /quizzes/:quizId/questions                     — question CRUD
  //   /quizzes/:quizId/questions/:questionId/options — option CRUD
  // Quiz
  router.post(  "/quizzes",                     authenticate, authorizeTeacher, quizController.createQuiz.bind(quizController));
  router.get(   "/quizzes/:quizId",             authenticate, authorizeTeacher, quizController.getQuiz.bind(quizController));
  router.patch( "/quizzes/:quizId",             authenticate, authorizeTeacher, quizController.updateQuiz.bind(quizController));
  router.patch( "/quizzes/:quizId/deadline",    authenticate, authorizeTeacher, quizController.updateDeadline.bind(quizController));
  router.post(  "/quizzes/:quizId/publish",     authenticate, authorizeTeacher, quizController.publishQuiz.bind(quizController));
  router.post(  "/quizzes/:quizId/hide",        authenticate, authorizeTeacher, quizController.hideQuiz.bind(quizController));
  router.get(   "/sections/:sectionId/quizzes", authenticate, authorizeTeacher, quizController.getQuizList.bind(quizController));

  // Question
  router.post(  "/quizzes/:quizId/questions",                               authenticate, authorizeTeacher, quizQuestionController.addQuestion.bind(quizQuestionController));
  router.delete("/quizzes/:quizId/questions/:questionId",                   authenticate, authorizeTeacher, quizQuestionController.removeQuestion.bind(quizQuestionController));
  router.patch( "/quizzes/:quizId/questions/:questionId",                   authenticate, authorizeTeacher, quizQuestionController.updateQuestion.bind(quizQuestionController));

  // AnswerOption
  router.post(  "/quizzes/:quizId/questions/:questionId/options",           authenticate, authorizeTeacher, quizQuestionController.addAnswerOption.bind(quizQuestionController));
  router.delete("/quizzes/:quizId/questions/:questionId/options/:optionId", authenticate, authorizeTeacher, quizQuestionController.removeAnswerOption.bind(quizQuestionController));
  router.patch( "/quizzes/:quizId/questions/:questionId/options/:optionId", authenticate, authorizeTeacher, quizQuestionController.updateAnswerOption.bind(quizQuestionController));

  return router;
}