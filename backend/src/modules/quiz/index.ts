import { QuizModel }       from "./infrastructure/models/QuizModel";
import { QuizRepository }  from "./infrastructure/repositories/QuizRepository";
import { QuizQueryService } from "./application/services/QuizQueryService";

// Entry point của Quiz Context.
//   - Module khác CHỈ được import từ file này
//   - Không được import thẳng vào bất kỳ file nào khác
//     bên trong quiz/ (ví dụ: quiz/infrastructure/..., quiz/domain/...)
//
// Những gì được export ra ngoài:
//   - IQuizQueryService   → interface để Quiz Attempt Context dùng (type-safe)
//   - QuizSnapshot        → DTO type cho start attempt validation
//   - QuizGradingData     → DTO type cho grading khi submit/expire
//   - createQuizQueryService() → factory để wire dependency
//
// Những gì KHÔNG export:
//   - Quiz entity, Question, AnswerOption (domain internals)
//   - QuizRepository, QuizModel (infrastructure internals)
//   - CreateQuizUseCase, PublishQuizUseCase, ... (application internals)

export type {
  IQuizQueryService,
  QuizSnapshot,
  QuizGradingData,
  QuizStudentViewData,
  StudentQuestionView,
  StudentOptionView,
} from "./application/interfaces/IQuizQueryService";
// Quiz Context tự wire dependency của mình.
// Caller chỉ cần gọi factory, không cần biết
// QuizRepository hay QuizModel bên trong tồn tại.
//
// Không cần nhận DB connection từ bên ngoài vì Quiz Context
// dùng MongoDB qua Mongoose — QuizModel đã bind vào Mongoose
// global connection khi server bootstrap gọi mongoose.connect().
export function createQuizQueryService(): QuizQueryService {
  const quizRepository = new QuizRepository(QuizModel);
  return new QuizQueryService(quizRepository);
}