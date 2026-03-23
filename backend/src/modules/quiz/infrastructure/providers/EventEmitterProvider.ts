import { EventEmitter } from "events";
import { IEventPublisher, QuizDomainEvent } from "../../application/interfaces/IEventPublisher";
import { QuizCreated }   from "../../domain/events/QuizCreated";
import { QuizPublished } from "../../domain/events/QuizPublished";
import { QuizHidden }    from "../../domain/events/QuizHidden";
import { QuizExpired }   from "../../domain/events/QuizExpired";

// Dùng Map thay vì switch/if-else để dễ extend khi thêm event mới:
// chỉ cần thêm 1 entry vào Map, không sửa logic emit.
const EVENT_NAMES = new Map<Function, string>([
  [QuizCreated,   "quiz.created"],
  [QuizPublished, "quiz.published"],
  [QuizHidden,    "quiz.hidden"],
  [QuizExpired,   "quiz.expired"],
]);

// Phù hợp với kiến trúc Modular Monolith: các context khác
// (Analytics) subscribe trực tiếp qua cùng EventEmitter instance.
//
// Cách dùng:
//   // Bootstrap (server.ts hoặc module setup)
//   const emitter = new EventEmitter();
//   const publisher = new EventEmitterProvider(emitter);
//
//   // Subscribe từ Analytics Context
//   emitter.on("quiz.published", (event: QuizPublished) => { ... });
//
// Lưu ý setMaxListeners:
//   Node.js mặc định warn khi có > 10 listeners trên 1 event.
//   Trong Modular Monolith nhiều context cùng subscribe nên tăng limit.
//   Gọi emitter.setMaxListeners(20) ở bootstrap nếu cần.

export class EventEmitterProvider implements IEventPublisher {
  constructor(private readonly emitter: EventEmitter) {}

  async publish(event: QuizDomainEvent): Promise<void> {
    const eventName = EVENT_NAMES.get(event.constructor);

    if (!eventName) {
      // Log thay vì throw — publish event không nên làm crash use case
      console.error(
        `EventEmitterProvider: Không tìm thấy event name cho "${event.constructor.name}". ` +
        `Kiểm tra EVENT_NAMES mapping.`
      );
      return;
    }

    // emit() là synchronous trong Node.js EventEmitter —
    // tất cả listener chạy inline trước khi return.
    // Wrap trong Promise để interface nhất quán và dễ swap
    // sang async message broker (Kafka, RabbitMQ) sau này.
    this.emitter.emit(eventName, event);
  }

  //helper để các context khác register listener
  // qua cùng một interface, không cần expose raw EventEmitter.
  // Generic T cho phép TypeScript infer đúng kiểu event trong callback:
  //   publisher.subscribe(QuizPublished, (e) => { e.quizId ... })
  subscribe<T extends QuizDomainEvent>(
    eventClass: new (...args: never[]) => T,
    listener: (event: T) => void
  ): void {
    const eventName = EVENT_NAMES.get(eventClass);

    if (!eventName) {
      throw new Error(
        `EventEmitterProvider: Không tìm thấy event name cho "${eventClass.name}".`
      );
    }

    this.emitter.on(eventName, listener);
  }

  //cleanup listener khi module shutdown
  unsubscribe<T extends QuizDomainEvent>(
    eventClass: new (...args: never[]) => T,
    listener: (event: T) => void
  ): void {
    const eventName = EVENT_NAMES.get(eventClass);
    if (!eventName) return;
    this.emitter.off(eventName, listener);
  }
}