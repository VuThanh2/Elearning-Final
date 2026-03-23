import { QuizRepository } from "../repositories/QuizRepository";
import { IEventPublisher } from "../../application/interfaces/IEventPublisher";
import { IDateTimeProvider } from "../../application/interfaces/IDateTimeProvider";
import { QuizExpired } from "../../domain/events/QuizExpired";

// Triggered theo interval (setInterval) từ server bootstrap.
// Không dùng IQuizRepository interface mà nhận QuizRepository
// (concrete class) trực tiếp vì cần findExpiredCandidates() —
// method nội bộ không nằm trong interface (chỉ job này mới dùng).
//
// Flow:
//   1. Lấy thời điểm hiện tại từ IDateTimeProvider
//   2. Query MongoDB tìm quiz Published/Hidden có deadlineAt <= now
//   3. Với mỗi quiz: gọi quiz.expire(now) → save → publish QuizExpired
//   4. Log tổng kết
//
// Idempotent:
//   quiz.expire() bên trong domain có guard "if already Expired → return"
//   nên job chạy lại không gây lỗi dù quiz đã được expire trước đó.
//
// Error isolation:
//   Lỗi ở một quiz không dừng cả batch — xử lý từng quiz trong
//   try/catch riêng, log lỗi và tiếp tục quiz tiếp theo.

export class QuizExpirationJob {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly dateTimeProvider: IDateTimeProvider,
    // intervalMs — khoảng cách giữa các lần chạy, mặc định 60 giây
    private readonly intervalMs: number = 60_000
  ) {}

  //gọi từ server bootstrap sau khi DB đã connect
  start(): void {
    if (this.intervalHandle !== null) {
      console.warn("QuizExpirationJob: Job đang chạy, không start lại.");
      return;
    }

    console.log(
      `QuizExpirationJob: Bắt đầu chạy mỗi ${this.intervalMs / 1000}s.`
    );

    // Chạy ngay lần đầu khi start, không chờ interval đầu tiên —
    // tránh bỏ sót quiz đã expire trong thời gian server down.
    void this.run();

    this.intervalHandle = setInterval(() => {
      void this.run();
    }, this.intervalMs);
  }

  //gọi khi server shutdown (graceful shutdown)
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log("QuizExpirationJob: Đã dừng.");
    }
  }

  //một lần thực thi, có thể gọi trực tiếp để test/trigger thủ công
  async run(): Promise<void> {
    const now = this.dateTimeProvider.now();

    let candidates: Awaited<ReturnType<typeof this.quizRepository.findExpiredCandidates>>;

    try {
      candidates = await this.quizRepository.findExpiredCandidates(now);
    } catch (err) {
      console.error("QuizExpirationJob: Lỗi khi query expired candidates:", err);
      return;
    }

    if (candidates.length === 0) return;

    console.log(
      `QuizExpirationJob: Tìm thấy ${candidates.length} quiz cần expire.`
    );

    let successCount = 0;
    let failCount    = 0;

    for (const quiz of candidates) {
      try {
        // Domain enforce: deadline phải đã qua mới expire được
        quiz.expire(now);

        // Persist trạng thái mới — replaceOne upsert
        await this.quizRepository.save(quiz);

        // Publish event để Analytics Context cập nhật projection
        await this.eventPublisher.publish(
          new QuizExpired(quiz.quizId, quiz.sectionId)
        );

        successCount++;
      } catch (err) {
        // Log chi tiết để debug nhưng không throw —
        // lỗi ở một quiz không nên dừng toàn bộ batch
        console.error(
          `QuizExpirationJob: Lỗi khi expire quizId "${quiz.quizId}":`,
          err
        );
        failCount++;
      }
    }

    console.log(
      `QuizExpirationJob: Hoàn tất — thành công: ${successCount}, lỗi: ${failCount}.`
    );
  }
}