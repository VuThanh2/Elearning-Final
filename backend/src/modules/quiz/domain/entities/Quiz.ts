import { v4 as uuidv4 } from "uuid";
import { Question } from "./Question";
import { AnswerOption } from "./AnswerOption";
import { QuizStatus } from "../value-objects/QuizStatus";
import { QuestionType } from "../value-objects/QuestionType";
import { TimeLimit } from "../value-objects/TimeLimit";
import { Deadline } from "../value-objects/Deadline";
import { MaxAttempts } from "../value-objects/MaxAttempts";
import { Points } from "../value-objects/Points";

// Tất cả thay đổi bên trong aggregate phải đi qua Quiz.
// Không ai được giữ reference trực tiếp đến Question/AnswerOption
// và gọi mutation method trên đó mà bỏ qua Quiz.
//
// State machine:
//   Draft → Published → Hidden ↔ Published
//                    → Expired (terminal, system-only)
//
// Editing rule:
//   Chỉ được sửa content khi status = Hidden
//   (Draft vẫn cho phép edit — quiz mới tạo chưa publish)
export class Quiz {
  readonly quizId: string;
  readonly teacherId: string;
  readonly sectionId: string;
  readonly createdAt: Date;

  private _title: string;
  private _description: string;
  private _timeLimit: TimeLimit;
  private _deadline: Deadline;
  private _maxAttempts: MaxAttempts;
  private _maxScore: Points;
  private _status: QuizStatus;
  private _questions: Question[];
  private _hiddenReason: string | null;
  private _updatedAt: Date | null;

  constructor(params: {
    quizId: string;
    teacherId: string;
    sectionId: string;
    title: string;
    description: string;
    timeLimit: TimeLimit;
    deadline: Deadline;
    maxAttempts: MaxAttempts;
    maxScore: Points;
    status: QuizStatus;
    questions: Question[];
    createdAt: Date;
    hiddenReason: string | null;
    updatedAt: Date | null;
  }) {
    this.quizId       = params.quizId;
    this.teacherId    = params.teacherId;
    this.sectionId    = params.sectionId;
    this.createdAt    = params.createdAt;
    this._title       = params.title;
    this._description = params.description;
    this._timeLimit   = params.timeLimit;
    this._deadline    = params.deadline;
    this._maxAttempts = params.maxAttempts;
    this._maxScore    = params.maxScore;
    this._status      = params.status;
    this._questions   = params.questions;
    this._hiddenReason = params.hiddenReason;
    this._updatedAt   = params.updatedAt;
  }

  // Getters
  get title(): string               { return this._title; }
  get description(): string         { return this._description; }
  get timeLimit(): TimeLimit        { return this._timeLimit; }
  get deadline(): Deadline          { return this._deadline; }
  get maxAttempts(): MaxAttempts    { return this._maxAttempts; }
  get maxScore(): Points            { return this._maxScore; }
  get status(): QuizStatus          { return this._status; }
  get hiddenReason(): string | null { return this._hiddenReason; }
  get updatedAt(): Date | null      { return this._updatedAt; }

  // Trả về bản copy để tránh mutation trực tiếp từ bên ngoài
  get questions(): ReadonlyArray<Question> {
    return [...this._questions];
  }

  // Điểm mỗi câu — hệ thống tự chia đều theo số câu hỏi
  get questionPoints(): number {
    if (this._questions.length === 0) return 0;
    return this._maxScore.perQuestion(this._questions.length);
  }

  // Factory method — tạo quiz mới (Draft)
  static create(params: {
    teacherId: string;
    sectionId: string;
    title: string;
    description: string;
    timeLimit: TimeLimit;
    deadline: Deadline;
    maxAttempts: MaxAttempts;
    maxScore: Points;
    now: Date; 
  }): Quiz {
    const now = new Date();
    return new Quiz({
      quizId:      uuidv4(),
      teacherId:   params.teacherId,
      sectionId:   params.sectionId,
      title:       params.title,
      description: params.description,
      timeLimit:   params.timeLimit,
      deadline:    params.deadline,
      maxAttempts: params.maxAttempts,
      maxScore:    params.maxScore,
      status:      QuizStatus.DRAFT,
      questions:   [],
      createdAt:   params.now,
      hiddenReason: null,
      updatedAt:   null,
    });
  }

  // Status transitions
  // Draft → Published  hoặc  Hidden → Published
  //
  // Business rules được check trước khi chuyển trạng thái:
  //   - Không publish Expired quiz
  //   - Quiz phải có ít nhất 1 câu hỏi
  //   - Mỗi câu hỏi phải hợp lệ (assertReadyToPublish)
  //   - Deadline chưa qua
  publish(now: Date): void {
    if (this._status === QuizStatus.EXPIRED) {
      throw new Error(
        "DomainError: Không thể publish lại quiz đã Expired."
      );
    }
    if (
      this._status !== QuizStatus.DRAFT &&
      this._status !== QuizStatus.HIDDEN
    ) {
      throw new Error(
        `DomainError: Không thể publish quiz đang ở trạng thái "${this._status}".`
      );
    }
    if (this._deadline.isPast(now)) {
      throw new Error(
        "DomainError: Không thể publish quiz đã quá deadline."
      );
    }
    if (this._questions.length === 0) {
      throw new Error(
        "DomainError: Quiz phải có ít nhất một câu hỏi trước khi publish."
      );
    }

    // Validate toàn bộ câu hỏi — delegate xuống Question
    for (const question of this._questions) {
      question.assertReadyToPublish();
    }

    this._status     = QuizStatus.PUBLISHED;
    this._updatedAt  = now;
    this._hiddenReason = null;
  }

  //Published → Hidden
  hide(reason: string | null, now: Date): void {
    if (this._status !== QuizStatus.PUBLISHED) {
      throw new Error(
        `DomainError: Chỉ có thể ẩn quiz đang Published (hiện tại: "${this._status}").`
      );
    }
    this._status      = QuizStatus.HIDDEN;
    this._hiddenReason = reason ?? null;
    this._updatedAt   = now;
  }

  // Published/Hidden → Expired  (system-only, gọi từ background job)
  //
  // Không cần check thêm — scheduler chỉ gọi khi đã xác nhận deadline qua.
  // Nhận now để Quiz tự confirm (defensive check).
  expire(now: Date): void {
    if (this._status === QuizStatus.EXPIRED) return; // idempotent

    if (this._status === QuizStatus.DRAFT) {
      throw new Error(
        "DomainError: Quiz ở trạng thái Draft không thể Expire (chưa từng Published)."
      );
    }
    if (!this._deadline.isPast(now)) {
      throw new Error(
        "DomainError: Deadline chưa qua, không thể chuyển quiz sang Expired."
      );
    }

    this._status    = QuizStatus.EXPIRED;
    this._updatedAt = now;
  }

  // Edit guards — dùng chung cho mọi mutation method bên dưới
  // Quiz có thể edit khi: Draft hoặc Hidden
  // Published và Expired thì không.
  private assertEditable(): void {
    if (
      this._status === QuizStatus.PUBLISHED ||
      this._status === QuizStatus.EXPIRED
    ) {
      throw new Error(
        `DomainError: Không thể chỉnh sửa quiz ở trạng thái "${this._status}". Quiz phải ở trạng thái Draft hoặc Hidden.`
      );
    }
  }

  // Quiz info mutations — title, description, config
  updateInfo(params: {
    title?: string;
    description?: string;
    now: Date;
  }): void {
    this.assertEditable();

    if (params.title !== undefined) {
      const trimmed = params.title.trim();
      if (!trimmed) {
        throw new Error("ValidationError: Tiêu đề quiz không được để trống.");
      }
      this._title = trimmed;
    }

    if (params.description !== undefined) {
      this._description = params.description.trim();
    }

    this._updatedAt = params.now;
  }

  updateTimeLimit(timeLimit: TimeLimit, now: Date): void {
    this.assertEditable();
    this._timeLimit = timeLimit;
    this._updatedAt = now;
  }

  updateMaxAttempts(maxAttempts: MaxAttempts, now: Date): void {
    this.assertEditable();
    this._maxAttempts = maxAttempts;
    this._updatedAt   = now;
  }

  // Cập nhật maxScore — tự động recalculate điểm mỗi câu
  updateMaxScore(maxScore: Points, now: Date): void {
    this.assertEditable();
    this._maxScore  = maxScore;
    this._updatedAt = now;
  }

  // Cập nhật deadline — phải lớn hơn deadline hiện tại
  updateDeadline(newDeadline: Deadline, now: Date): void {
    this.assertEditable();
    newDeadline.mustBeAfter(this._deadline);
    this._deadline  = newDeadline;
    this._updatedAt = now;
  }

  // Question management — CRUD thông qua Quiz 

  // Thêm câu hỏi mới — trả về Question vừa tạo để caller biết questionId
  addQuestion(params: {
    content: string;
    questionType: QuestionType;
    now: Date;
  }): Question {
    this.assertEditable();

    const question = new Question({
      questionId:    uuidv4(),
      quizId:        this.quizId,
      content:       params.content,
      questionType:  params.questionType,
      answerOptions: [],
    });

    this._questions.push(question);
    this._updatedAt = params.now;
    return question;
  }

  // Xóa câu hỏi theo questionId
  removeQuestion(questionId: string, now: Date): void {
    this.assertEditable();

    const idx = this._questions.findIndex(
      (q) => q.questionId === questionId
    );
    if (idx === -1) {
      throw new Error(
        `DomainError: Câu hỏi "${questionId}" không tồn tại trong quiz này.`
      );
    }

    this._questions.splice(idx, 1);
    this._updatedAt = now;
  }

  // Cập nhật content của câu hỏi
  updateQuestionContent(params: {
    questionId: string;
    content: string;
    now: Date;
  }): void {
    this.assertEditable();
    const question = this.findQuestionOrThrow(params.questionId);
    question.updateContent(params.content);
    this._updatedAt = params.now;
  }

  // AnswerOption management — đi qua Quiz → Question

  // Thêm option vào câu hỏi — trả về AnswerOption vừa tạo
  addAnswerOption(params: {
    questionId: string;
    content: string;
    isCorrect: boolean;
    now: Date;
  }): AnswerOption {
    this.assertEditable();
    const question = this.findQuestionOrThrow(params.questionId);
    const option   = question.addAnswerOption({
      content:   params.content,
      isCorrect: params.isCorrect,
    });
    this._updatedAt = params.now;
    return option;
  }

  // Xóa option khỏi câu hỏi
  removeAnswerOption(params: {
    questionId: string;
    optionId: string;
    now: Date;
  }): void {
    this.assertEditable();
    const question = this.findQuestionOrThrow(params.questionId);
    question.removeAnswerOption(params.optionId);
    this._updatedAt = params.now;
  }

  // Cập nhật content hoặc isCorrect của một option
  updateAnswerOption(params: {
    questionId: string;
    optionId: string;
    content?: string;
    isCorrect?: boolean;
    now: Date;
  }): void {
    this.assertEditable();
    const question = this.findQuestionOrThrow(params.questionId);
    const option   = question.findOptionOrThrow(params.optionId);

    if (params.content !== undefined) {
      option.updateContent(params.content);
    }
    if (params.isCorrect !== undefined) {
      params.isCorrect ? option.markAsCorrect() : option.markAsIncorrect();
    }

    this._updatedAt = params.now;
  }

  // Helpers
  private findQuestionOrThrow(questionId: string): Question {
    const question = this._questions.find(
      (q) => q.questionId === questionId
    );
    if (!question) {
      throw new Error(
        `DomainError: Câu hỏi "${questionId}" không tồn tại trong quiz này.`
      );
    }
    return question;
  }

  // Kiểm tra nhanh quiz có đang accessible với Student không
  // (dùng trong Quiz Attempt Context khi validate)
  isAccessible(): boolean {
    return this._status === QuizStatus.PUBLISHED;
  }
}