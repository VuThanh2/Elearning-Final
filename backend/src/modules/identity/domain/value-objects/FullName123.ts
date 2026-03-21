export class FullName {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(value: string): FullName {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new Error("ValidationError: Họ tên không được để trống.");
    }
    if (trimmed.length > 100) {
      throw new Error("ValidationError: Họ tên không được vượt quá 100 ký tự.");
    }
    return new FullName(trimmed);
  }

  get value(): string {
    return this._value;
  }

  equals(other: FullName): boolean {
    return this._value === other._value;
  }
}