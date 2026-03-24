// Tính từ startedAt đến submittedAt.
// Lưu trữ dưới dạng milliseconds để chính xác,
// expose thêm minutes/seconds cho tiện hiển thị.
//
// Business rules:
//   - Duration phải >= 0 (submittedAt >= startedAt)
//   - Duration = 0 xảy ra khi submit ngay lập tức (edge case nhưng hợp lệ)
export class Duration {
  private readonly _ms: number;

  private constructor(ms: number) {
    this._ms = ms;
  }

  // Tính duration từ 2 mốc thời gian
  static fromTimestamps(startedAt: Date, submittedAt: Date): Duration {
    const ms = submittedAt.getTime() - startedAt.getTime();
    if (ms < 0) {
      throw new Error(
        "ValidationError: Thời điểm nộp bài không được trước thời điểm bắt đầu."
      );
    }
    return new Duration(ms);
  }

  // Tạo từ milliseconds đã lưu trong DB
  static fromPersisted(ms: number): Duration {
    return new Duration(ms);
  }

  // Milliseconds — dùng để lưu DB hoặc so sánh chính xác
  get ms(): number {
    return this._ms;
  }

  // Seconds — dùng cho API response
  get seconds(): number {
    return Math.floor(this._ms / 1000);
  }

  // Minutes — dùng cho hiển thị (ví dụ: "20m" trong Analytics view)
  get minutes(): number {
    return Math.floor(this._ms / 60_000);
  }

  // Format đọc được: "20m 30s"
  get formatted(): string {
    const mins = this.minutes;
    const secs = this.seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  }

  // Kiểm tra duration có vượt quá time limit không
  // timeLimitMs: giới hạn thời gian tính bằng milliseconds
  exceedsLimit(timeLimitMs: number): boolean {
    return this._ms > timeLimitMs;
  }

  equals(other: Duration): boolean {
    return this._ms === other._ms;
  }
}