// Business rule: phải >= 1 (ít nhất 1 lần)
export class MaxAttempts {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): MaxAttempts {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(
        "ValidationError: Số lần làm tối đa phải là số nguyên >= 1."
      );
    }
    return new MaxAttempts(value);
  }

  static fromPersisted(value: number): MaxAttempts {
    return new MaxAttempts(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: MaxAttempts): boolean {
    return this._value === other._value;
  }
}