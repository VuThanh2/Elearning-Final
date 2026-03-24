// Chứa cả value (điểm đạt được) và maxScore (điểm tối đa)
// để tính percentage mà không cần tra cứu thêm.
//
// Business rules:
//   - value >= 0
//   - maxScore > 0
//   - value <= maxScore
export class Score {
  private readonly _value: number;
  private readonly _maxScore: number;

  private constructor(value: number, maxScore: number) {
    this._value    = value;
    this._maxScore = maxScore;
  }

  // Dùng khi tạo attempt mới — score bắt đầu = 0, maxScore lấy từ quiz
  static zero(maxScore: number): Score {
    if (maxScore <= 0) {
      throw new Error("ValidationError: Điểm tối đa phải > 0.");
    }
    return new Score(0, maxScore);
  }

  // Dùng khi chấm điểm xong — set score cuối cùng
  static create(value: number, maxScore: number): Score {
    if (maxScore <= 0) {
      throw new Error("ValidationError: Điểm tối đa phải > 0.");
    }
    if (value < 0) {
      throw new Error("ValidationError: Điểm không được âm.");
    }
    if (value > maxScore) {
      throw new Error(
        `ValidationError: Điểm (${value}) không được vượt quá điểm tối đa (${maxScore}).`
      );
    }
    return new Score(value, maxScore);
  }

  static fromPersisted(value: number, maxScore: number): Score {
    return new Score(value, maxScore);
  }

  get value(): number {
    return this._value;
  }

  get maxScore(): number {
    return this._maxScore;
  }

  // percentage = score / maxScore
  // Trả về giá trị từ 0 đến 1 (ví dụ: 0.85 = 85%)
  get percentage(): number {
    if (this._maxScore === 0) return 0;
    return this._value / this._maxScore;
  }

  equals(other: Score): boolean {
    return (
      this._value === other._value &&
      this._maxScore === other._maxScore
    );
  }
}