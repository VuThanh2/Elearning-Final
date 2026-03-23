import { v4 as uuidv4 } from "uuid";
import { AnswerOption } from "./AnswerOption";
import { QuestionType } from "../value-objects/QuestionType";

// Invariants:
//   1. Phải có >= 1 AnswerOption đúng trước khi Quiz publish
//   2. Với MULTIPLE_CHOICE: phải có >= 2 AnswerOption
//   3. AnswerOption chỉ được tạo/xóa thông qua Question
//
// Lưu ý: invariant #1 và #2 được check khi Quiz.publish() gọi
// question.assertReadyToPublish() — không enforce tức thì ở mỗi
// mutation vì Teacher cần tự do thêm từng option một.

export class Question {
  readonly questionId: string;
  readonly quizId: string;

  private _content: string;
  private _questionType: QuestionType;
  private _answerOptions: AnswerOption[];

  constructor(params: {
    questionId: string;
    quizId: string;
    content: string;
    questionType: QuestionType;
    answerOptions: AnswerOption[];
  }) {
    this.questionId     = params.questionId;
    this.quizId         = params.quizId;
    this._content       = params.content;
    this._questionType  = params.questionType;
    this._answerOptions = params.answerOptions;
  }

  get content(): string {
    return this._content;
  }

  get questionType(): QuestionType {
    return this._questionType;
  }

  // Trả về bản copy để tránh mutation từ bên ngoài
  get answerOptions(): ReadonlyArray<AnswerOption> {
    return [...this._answerOptions];
  }

  get correctOptions(): ReadonlyArray<AnswerOption> {
    return this._answerOptions.filter((o) => o.isCorrect);
  }

  // Mutation methods — chỉ được gọi khi Quiz.status = Hidden
  // Guard được thực hiện ở Quiz entity trước khi delegate vào đây
  updateContent(content: string): void {
    const trimmed = content?.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new Error(
        "ValidationError: Nội dung câu hỏi không được để trống."
      );
    }
    this._content = trimmed;
  }

  // Thêm một AnswerOption mới vào câu hỏi.
  // optionId được tạo tự động.
  addAnswerOption(params: {
    content: string;
    isCorrect: boolean;
  }): AnswerOption {
    const option = new AnswerOption({
      optionId:   uuidv4(),
      questionId: this.questionId,
      content:    params.content,
      isCorrect:  params.isCorrect,
    });
    this._answerOptions.push(option);
    return option;
  }

  // Xóa một AnswerOption theo optionId.
  // Không check invariant ngay — Quiz.publish() sẽ check toàn bộ.
  removeAnswerOption(optionId: string): void {
    const idx = this._answerOptions.findIndex((o) => o.optionId === optionId);
    if (idx === -1) {
      throw new Error(
        `DomainError: AnswerOption "${optionId}" không tồn tại trong câu hỏi này.`
      );
    }
    this._answerOptions.splice(idx, 1);
  }

  // Tìm và trả về option theo id — dùng khi update content của option
  findOptionOrThrow(optionId: string): AnswerOption {
    const option = this._answerOptions.find((o) => o.optionId === optionId);
    if (!option) {
      throw new Error(
        `DomainError: AnswerOption "${optionId}" không tồn tại trong câu hỏi này.`
      );
    }
    return option;
  }

  // Kiểm tra câu hỏi đã sẵn sàng để publish chưa.
  // Throw nếu vi phạm bất kỳ invariant nào.
  //
  // Rules được enforce:
  //   [1] MULTIPLE_CHOICE phải có >= 2 option
  //   [2] Phải có >= 1 correct answer
  //       → Không giới hạn số đáp án đúng: 1 đúng (single-answer) hay
  //         nhiều đúng (multi-answer) đều hợp lệ — Teacher tự quyết định
  assertReadyToPublish(): void {
    // [1] Số lượng options tối thiểu theo question type
    if (
      this._questionType === QuestionType.MULTIPLE_CHOICE &&
      this._answerOptions.length < 2
    ) {
      throw new Error(
        `DomainError: Câu hỏi trắc nghiệm "${this._content}" phải có ít nhất 2 lựa chọn.`
      );
    }

    // [2] Phải có ít nhất 1 đáp án đúng — không quan tâm là 1 hay nhiều
    const hasCorrect = this._answerOptions.some((o) => o.isCorrect);
    if (!hasCorrect) {
      throw new Error(
        `DomainError: Câu hỏi "${this._content}" chưa có đáp án đúng.`
      );
    }
  }
}