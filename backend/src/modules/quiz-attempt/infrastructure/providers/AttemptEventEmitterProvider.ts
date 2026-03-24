import { EventEmitter } from "events";
import { IEventPublisher, QuizAttemptDomainEvent } from "../../application/interfaces/IEventPublisher";
import { QuizAttemptStarted }   from "../../domain/events/QuizAttemptStarted";
import { QuizAttemptSubmitted } from "../../domain/events/QuizAttemptSubmitted";
import { QuizAttemptExpired }   from "../../domain/events/QuizAttemptExpired";

// Dùng Map thay vì switch/if-else để dễ extend khi thêm event mới:
// chỉ cần thêm 1 entry vào Map, không sửa logic emit.
const EVENT_NAMES = new Map<Function, string>([
  [QuizAttemptStarted,   "attempt.started"],
  [QuizAttemptSubmitted, "attempt.submitted"],
  [QuizAttemptExpired,   "attempt.expired"],
]);

// (Analytics, Identity) subscribe trực tiếp qua cùng EventEmitter instance.
//
// Cách dùng:
//   // Bootstrap (server.ts)
//   const emitter = new EventEmitter();
//   const publisher = new AttemptEventEmitterProvider(emitter);
//
//   // Subscribe từ Analytics Context
//   emitter.on("attempt.submitted", (event: QuizAttemptSubmitted) => { ... });
//
//   // Subscribe từ Identity Context (update StudentProfile)
//   emitter.on("attempt.submitted", (event: QuizAttemptSubmitted) => { ... });

export class AttemptEventEmitterProvider implements IEventPublisher {
  constructor(private readonly emitter: EventEmitter) {}

  async publish(event: QuizAttemptDomainEvent): Promise<void> {
    const eventName = EVENT_NAMES.get(event.constructor);

    if (!eventName) {
      // Log thay vì throw — publish event không nên làm crash use case
      console.error(
        `AttemptEventEmitterProvider: Không tìm thấy event name cho "${event.constructor.name}". ` +
        `Kiểm tra EVENT_NAMES mapping.`
      );
      return;
    }

    this.emitter.emit(eventName, event);
  }

  // Helper để các context khác register listener
  // qua typed interface, không cần expose raw EventEmitter.
  subscribe<T extends QuizAttemptDomainEvent>(
    eventClass: new (...args: never[]) => T,
    listener: (event: T) => void,
  ): void {
    const eventName = EVENT_NAMES.get(eventClass);

    if (!eventName) {
      throw new Error(
        `AttemptEventEmitterProvider: Không tìm thấy event name cho "${eventClass.name}".`
      );
    }

    this.emitter.on(eventName, listener);
  }

  // Cleanup listener khi module shutdown
  unsubscribe<T extends QuizAttemptDomainEvent>(
    eventClass: new (...args: never[]) => T,
    listener: (event: T) => void,
  ): void {
    const eventName = EVENT_NAMES.get(eventClass);
    if (!eventName) return;
    this.emitter.off(eventName, listener);
  }
}