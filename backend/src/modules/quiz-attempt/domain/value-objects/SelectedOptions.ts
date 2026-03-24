// danh sách optionId mà student đã chọn cho 1 câu hỏi.
// Hỗ trợ cả single-choice và multi-choice:
//   - Single choice: optionIds có đúng 1 phần tử
//   - Multi choice:  optionIds có nhiều phần tử
//
// Business rule:
//   - Phải chọn ít nhất 1 option
export class SelectedOptions {
  private readonly _optionIds: string[];

  private constructor(optionIds: string[]) {
    this._optionIds = [...optionIds];
  }

  static create(optionIds: string[]): SelectedOptions {
    if (!optionIds || optionIds.length === 0) {
      throw new Error(
        "ValidationError: Phải chọn ít nhất 1 đáp án."
      );
    }

    // Loại bỏ duplicate — student có thể vô tình gửi trùng
    const unique = [...new Set(optionIds)];

    // Validate mỗi optionId không rỗng
    for (const id of unique) {
      if (!id || id.trim().length === 0) {
        throw new Error(
          "ValidationError: optionId không được để trống."
        );
      }
    }

    return new SelectedOptions(unique);
  }

  static fromPersisted(optionIds: string[]): SelectedOptions {
    return new SelectedOptions(optionIds);
  }

  get optionIds(): ReadonlyArray<string> {
    return [...this._optionIds];
  }

  // So sánh với danh sách correctOptionIds để xác định câu trả lời đúng/sai.
  //
  // Logic: student đúng khi và chỉ khi tập hợp đã chọn === tập hợp đáp án đúng
  // (đúng hết, không thừa, không thiếu)
  isCorrect(correctOptionIds: string[]): boolean {
    if (this._optionIds.length !== correctOptionIds.length) return false;

    const selected = new Set(this._optionIds);
    return correctOptionIds.every((id) => selected.has(id));
  }

  equals(other: SelectedOptions): boolean {
    if (this._optionIds.length !== other._optionIds.length) return false;
    const thisSet = new Set(this._optionIds);
    return other._optionIds.every((id) => thisSet.has(id));
  }
}