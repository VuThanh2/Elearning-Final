// Invariant: chỉ được tạo thông qua Question (không new trực tiếp từ ngoài).
// Question.addAnswerOption() / Question.removeAnswerOption() là entry point duy nhất.
//
// AnswerOption không có behavior phức tạp — nó là data holder
// với một flag isCorrect quan trọng cho việc chấm điểm.

export class AnswerOption {
  readonly optionId: string;
  readonly questionId: string;

  private _content: string;
  private _isCorrect: boolean;

  constructor(params: {
    optionId: string;
    questionId: string;
    content: string;
    isCorrect: boolean;
  }) {
    this.optionId    = params.optionId;
    this.questionId  = params.questionId;
    this._content    = params.content;
    this._isCorrect  = params.isCorrect;
  }

  get content(): string {
    return this._content;
  }

  get isCorrect(): boolean {
    return this._isCorrect;
  }

  // Dùng khi Teacher edit nội dung option (quiz phải ở Hidden state —
  // guard này được enforce ở Quiz entity, không phải ở đây).
  updateContent(content: string): void {
    const trimmed = content?.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new Error(
        "ValidationError: Nội dung câu trả lời không được để trống."
      );
    }
    this._content = trimmed;
  }

  // Đánh dấu option này là đúng/sai.
  // Sau khi gọi, Question phải re-validate invariant "có ít nhất 1 đáp án đúng".
  markAsCorrect(): void {
    this._isCorrect = true;
  }

  markAsIncorrect(): void {
    this._isCorrect = false;
  }
}