// Số thứ tự attempt của student trong cùng 1 quiz.
// Ví dụ: student làm lần 1 → attemptNumber = 1, lần 2 → 2, ...
//
// Business rule:
//   attemptNumber phải >= 1

export class AttemptNumber {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): AttemptNumber {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(
        "ValidationError: Số thứ tự attempt phải là số nguyên >= 1."
      );
    }
    return new AttemptNumber(value);
  }

  static fromPersisted(value: number): AttemptNumber {
    return new AttemptNumber(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: AttemptNumber): boolean {
    return this._value === other._value;
  }
}