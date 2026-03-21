export class Password {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(plainText: string): Password {
    if (!plainText || plainText.trim().length === 0) {
      throw new Error("ValidationError: Password không được để trống.");
    }
    if (plainText.length < 8) {
      throw new Error("ValidationError: Password phải có ít nhất 8 ký tự.");
    }
    if (!/[A-Z]/.test(plainText)) {
      throw new Error("ValidationError: Password phải có ít nhất 1 chữ hoa.");
    }
    if (!/[0-9]/.test(plainText)) {
      throw new Error("ValidationError: Password phải có ít nhất 1 chữ số.");
    }
    return new Password(plainText);
  }

  static fromHash(hash: string): Password {
    return new Password(hash);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Password): boolean {
    return this._value === other._value;
  }
}