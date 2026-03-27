// Entry point của Quiz Attempt Context
//
// Quy tắc nhất quán với toàn project:
//   Module khác CHỈ được import từ file này.
//   Không import thẳng vào bất kỳ file nào bên trong quiz-attempt/.
//
// NHỮNG GÌ KHÔNG EXPORT (internal only):
//   - QuizAttempt entity, StudentAnswer entity
//   - IQuizAttemptRepository
//   - StartQuizAttemptUseCase, SubmitQuizAttemptUseCase, ExpireQuizAttemptUseCase
//   - QuizAttemptModel, QuizAttemptMapper
//   - AttemptEventEmitterProvider
export { QuizAttemptStarted }   from "./domain/events/QuizAttemptStarted";
export { QuizAttemptSubmitted } from "./domain/events/QuizAttemptSubmitted";
export { QuizAttemptExpired }   from "./domain/events/QuizAttemptExpired";

// QuizAttemptDomainEvent union type — dùng bởi AttemptEventEmitterProvider
// và bất kỳ subscriber nào cần exhaustive type handling
export type { QuizAttemptDomainEvent } from "./application/interfaces/IEventPublisher";