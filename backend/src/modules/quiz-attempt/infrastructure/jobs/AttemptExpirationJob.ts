import { QuizAttemptRepository } from "../repositories/QuizAttemptRepository";
import { IEventPublisher } from "../../application/interfaces/IEventPublisher";
import { IDateTimeProvider } from "../../application/interfaces/IDateTimeProvider";
import { QuizAttemptExpired } from "../../domain/events/QuizAttemptExpired";
import { IQuizQueryService } from "../../../quiz";

// Trong flow bình thường, expire xảy ra ở FRONTEND:
//   1. Frontend detect timer hết giờ
//   2. Frontend gửi request POST /attempts/:id/expire kèm toàn bộ answers đã chọn
//   3. Server chấm điểm bình thường (câu đã chọn → chấm, chưa chọn → 0)
//   → Student vẫn được điểm cho những câu đã làm
//
// Job này chỉ xử lý trường hợp frontend KHÔNG gửi được (mất mạng, tắt browser):
//   - Scan attempt InProgress có expiresAt <= now
//   - Vì MVP không có autosave, server không biết student đã chọn gì
//   - → submittedAnswers = empty → score = 0 (đúng thực tế vì không có data)
//   - Đây là trade-off chấp nhận được cho MVP
//
// Nếu sau này thêm autosave (lưu partial answers vào Redis/MongoDB giữa chừng):
//   - Job đọc partial answers trước khi gọi expire
//   - Student được điểm cho những câu đã lưu
//   - Không cần sửa domain logic, chỉ thay empty Map bằng data thật
export class AttemptExpirationJob {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly attemptRepository: QuizAttemptRepository,
    private readonly quizQueryService: IQuizQueryService,
    private readonly eventPublisher: IEventPublisher,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly intervalMs: number = 60_000,
  ) {}

  start(): void {
    if (this.intervalHandle !== null) {
      console.warn("AttemptExpirationJob: Job đang chạy, không start lại.");
      return;
    }

    console.log(
      `AttemptExpirationJob: Bắt đầu chạy mỗi ${this.intervalMs / 1000}s.`
    );

    void this.run();

    this.intervalHandle = setInterval(() => {
      void this.run();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log("AttemptExpirationJob: Đã dừng.");
    }
  }

  async run(): Promise<void> {
    const now = this.dateTimeProvider.now();

    let candidates: Awaited<ReturnType<typeof this.attemptRepository.findExpiredCandidates>>;

    try {
      candidates = await this.attemptRepository.findExpiredCandidates(now);
    } catch (err) {
      console.error("AttemptExpirationJob: Lỗi khi query expired candidates:", err);
      return;
    }

    if (candidates.length === 0) return;

    console.log(
      `AttemptExpirationJob: Tìm thấy ${candidates.length} attempt cần expire.`
    );

    let successCount = 0;
    let failCount    = 0;

    for (const attempt of candidates) {
      try {
        const gradingData = await this.quizQueryService.getQuizGradingData(attempt.quizId);

        if (!gradingData) {
          console.error(
            `AttemptExpirationJob: Không tìm thấy quiz "${attempt.quizId}" ` +
            `cho attempt "${attempt.attemptId}". Bỏ qua.`
          );
          failCount++;
          continue;
        }

        // MVP: không có autosave → server không biết student đã chọn gì
        // → empty Map → tất cả câu = createUnanswered() → score = 0
        //
        // Flow chính (frontend expire) gửi answers đầy đủ nên student
        // vẫn được điểm cho những câu đã làm. Job này là fallback cuối.
        const submittedAnswers = new Map<string, string[]>();

        attempt.expire({
          submittedAnswers,
          quizGradingData: gradingData,
          now,
        });

        await this.attemptRepository.save(attempt);

        await this.eventPublisher.publish(
          new QuizAttemptExpired(
            attempt.attemptId,
            attempt.quizId,
            attempt.studentId,
            attempt.sectionId,
            attempt.attemptNumber.value,
            attempt.score.value,
            attempt.score.maxScore,
            [],
            now,
          )
        );

        successCount++;
      } catch (err) {
        console.error(
          `AttemptExpirationJob: Lỗi khi expire attemptId "${attempt.attemptId}":`,
          err
        );
        failCount++;
      }
    }

    console.log(
      `AttemptExpirationJob: Hoàn tất — thành công: ${successCount}, lỗi: ${failCount}.`
    );
  }
}