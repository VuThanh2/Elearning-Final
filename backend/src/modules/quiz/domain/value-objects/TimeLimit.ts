// Business rule: phải > 0
// Lưu dưới dạng số nguyên dương (không có "unlimited" — nếu cần
// thì model bằng Optional<TimeLimit> ở tầng trên, không phải value
// đặc biệt bên trong).

export class TimeLimit {
  private readonly _minutes: number;

  private constructor(minutes: number) {
    this._minutes = minutes;
  }

  // Dùng khi Teacher nhập time limit mới — có validate
  static create(minutes: number): TimeLimit {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new Error(
        "ValidationError: Time limit phải là số nguyên dương (phút)."
      );
    }
    return new TimeLimit(minutes);
  }

  // Dùng khi reconstruct từ DB — bỏ qua validate
  static fromPersisted(minutes: number): TimeLimit {
    return new TimeLimit(minutes);
  }

  get minutes(): number {
    return this._minutes;
  }

  equals(other: TimeLimit): boolean {
    return this._minutes === other._minutes;
  }
}