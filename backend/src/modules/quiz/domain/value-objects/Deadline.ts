// Business rules được enforce ở đây:
//   1. deadline > createdAt  (Deadline Validation)
//   2. newDeadline > currentDeadline  (Deadline Constraints)
//
// Rule #1 validate tại create(), rule #2 validate tại mustBeAfter()
// vì cần so sánh với deadline hiện tại — đó là việc của Quiz entity.
export class Deadline {
  private readonly _value: Date;

  private constructor(value: Date) {
    this._value = value;
  }

  // Dùng khi tạo quiz mới hoặc cập nhật deadline —
  // createdAt truyền vào để enforce "deadline > createdAt"
  static create(value: Date, createdAt: Date): Deadline {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("ValidationError: Deadline không hợp lệ.");
    }
    if (value <= createdAt) {
      throw new Error(
        "ValidationError: Deadline phải lớn hơn thời điểm tạo quiz."
      );
    }
    return new Deadline(value);
  }

  // Dùng khi reconstruct từ DB
  static fromPersisted(value: Date): Deadline {
    return new Deadline(value);
  }

  // Kiểm tra deadline mới có sau deadline hiện tại không.
  // Gọi ở Quiz entity khi Teacher cập nhật deadline.
  mustBeAfter(other: Deadline): void {
    if (this._value <= other._value) {
      throw new Error(
        "ValidationError: Deadline mới phải lớn hơn deadline hiện tại."
      );
    }
  }

  // Kiểm tra deadline đã qua chưa — dùng trong Quiz.checkExpiry()
  isPast(now: Date): boolean {
    return now >= this._value;
  }

  get value(): Date {
    return this._value;
  }

  equals(other: Deadline): boolean {
    return this._value.getTime() === other._value.getTime();
  }
}