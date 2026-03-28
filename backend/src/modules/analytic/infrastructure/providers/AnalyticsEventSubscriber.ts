import { EventEmitter } from "events";
import oracledb         from "oracledb";
import { RedisClientType } from "redis";

import { QuizAttemptSubmitted, QuizAttemptExpired } from "../../../quiz-attempt";
import { QuizAttemptSubmittedProjector } from "../projectors/QuizAttemptSubmittedProjector";
import { StudentQuizAnswerModel } from "../database/nosql/models/StudentQuizAnswerModel";
import { QuestionFailureRateModel } from "../database/nosql/models/QuestionFailureRateModel";

import { IAnalyticCache }    from "../../domain/interface-repositories/IAnalyticCache";
import { RedisAnalyticCache } from "./RedisAnalyticCache";

// Provider đăng ký lắng nghe events cho Analytics Context
// Trách nhiệm duy nhất: wire listeners vào EventEmitter khi bootstrap.
//
// Tại sao tách Subscriber và Projector?
//   Subscriber biết: event name, emitter instance.
//   Projector biết: ghi gì vào Oracle/MongoDB, SQL syntax, idempotency.
//   Hai concern thay đổi vì lý do khác nhau.
//   Khi đổi transport (EventEmitter → Kafka), chỉ sửa Subscriber.
//
// Luồng đầy đủ:
//   server.ts bootstrap → subscriber.register()
//   QuizAttempt publish "attempt.submitted"
//     → emitter.emit("attempt.submitted", enrichedEvent)
//     → handleAttemptFinalized(event, "SUBMITTED")
//       → projector.handle(event)
export function createAnalyticsEventSubscriber(
  eventEmitter:     EventEmitter,
  oracleConnection: oracledb.Connection,
  redisClient:      RedisClientType,
): AnalyticsEventSubscriber {
  const cache: IAnalyticCache = new RedisAnalyticCache(redisClient);
  const projector = new QuizAttemptSubmittedProjector(
    oracleConnection,
    StudentQuizAnswerModel,
    QuestionFailureRateModel,
    cache,
    // Không cần IAcademicQueryService — Projector dùng SQL JOIN
  );
  return new AnalyticsEventSubscriber(eventEmitter, projector);
}
 
export class AnalyticsEventSubscriber {
  constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly projector:    QuizAttemptSubmittedProjector,
  ) {}
 
  // Đăng ký listeners — gọi 1 lần khi server bootstrap
  register(): void {
    this.eventEmitter.on(
      "attempt.submitted",
      (event: QuizAttemptSubmitted) => this.handleAttemptFinalized(event, "SUBMITTED"),
    );
    this.eventEmitter.on(
      "attempt.expired",
      (event: QuizAttemptExpired) => this.handleAttemptFinalized(event, "EXPIRED"),
    );
    console.log("[Analytics] EventSubscriber registered: attempt.submitted, attempt.expired");
  }
 
  // Cleanup khi server shutdown — tránh memory leak
  unregister(): void {
    this.eventEmitter.removeAllListeners("attempt.submitted");
    this.eventEmitter.removeAllListeners("attempt.expired");
  }
 
  private async handleAttemptFinalized(
    event:  QuizAttemptSubmitted | QuizAttemptExpired,
    status: "SUBMITTED" | "EXPIRED",
  ): Promise<void> {
    try {
      await this.projector.handle(event, status);
    } catch (err) {
      // Log nhưng KHÔNG rethrow.
      // EventEmitter.emit() là synchronous — nếu listener throw,
      // lỗi bubble lên Use Case đang gọi emit() và rollback transaction chính.
      // Analytics failure không nên làm quiz submit/expire fail.
      // Eventually consistent: projection có thể trễ, attempt đã được saved.
      console.error(
        `[Analytics] Projection failed for attemptId="${event.attemptId}": `,
        err instanceof Error ? err.message : err,
      );
    }
  }
}