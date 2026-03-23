// Business rule: phải > 0
// Đây là điểm của QUIZ (maxScore), không phải điểm từng câu hỏi.
// Điểm từng câu được hệ thống tự tính:
//   questionPoints = maxScore / numberOfQuestions

export class Points {
  private readonly _value: number;

  private constructor(value: number) {
    this._value = value;
  }

  static create(value: number): Points {
    if (typeof value !== "number" || value <= 0) {
      throw new Error("ValidationError: Điểm quiz phải lớn hơn 0.");
    }
    return new Points(value);
  }

  static fromPersisted(value: number): Points {
    return new Points(value);
  }

  // Tính điểm mỗi câu khi biết số câu hỏi.
  // Dùng trong Quiz.computeQuestionPoints()
  perQuestion(numberOfQuestions: number): number {
    if (numberOfQuestions <= 0) {
      throw new Error(
        "DomainError: Số câu hỏi phải > 0 để tính điểm mỗi câu."
      );
    }
    return this._value / numberOfQuestions;
  }

  get value(): number {
    return this._value;
  }

  equals(other: Points): boolean {
    return this._value === other._value;
  }
}