import { QuizCreated }   from "../../domain/events/QuizCreated";
import { QuizPublished } from "../../domain/events/QuizPublished";
import { QuizHidden }    from "../../domain/events/QuizHidden";
import { QuizExpired }   from "../../domain/events/QuizExpired";

// Tại sao cần publish events:
//   - Analytics Context lắng nghe để update projections
//   - Modular Monolith: dùng Node.js EventEmitter in-process
//   - Nếu sau này scale thành microservice: swap implementation
//     sang Kafka/RabbitMQ mà không đụng đến use case

// Union type của tất cả events Quiz Context có thể phát ra —
// giúp TypeScript enforce exhaustive handling ở subscriber
export type QuizDomainEvent =
  | QuizCreated
  | QuizPublished
  | QuizHidden
  | QuizExpired;

export interface IEventPublisher {
  publish(event: QuizDomainEvent): Promise<void>;
}