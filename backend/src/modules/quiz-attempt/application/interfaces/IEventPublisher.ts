import { QuizAttemptStarted }   from "../../domain/events/QuizAttemptStarted";
import { QuizAttemptSubmitted } from "../../domain/events/QuizAttemptSubmitted";
import { QuizAttemptExpired }   from "../../domain/events/QuizAttemptExpired";

//   - Analytics Context lắng nghe để update projections
//     (QuizPerformanceView, StudentClassRankingView, AtRiskStudentView, ...)
//   - Identity Context lắng nghe QuizAttemptSubmitted để update
//     StudentProfile.completedQuizAttempts và averageScore

// Union type — TypeScript enforce exhaustive handling ở subscriber
export type QuizAttemptDomainEvent =
  | QuizAttemptStarted
  | QuizAttemptSubmitted
  | QuizAttemptExpired;

export interface IEventPublisher {
  publish(event: QuizAttemptDomainEvent): Promise<void>;
}