import { v4 as uuidv4 } from "uuid";
import { StudentAnswer } from "./StudentAnswer";
import { AttemptStatus } from "../value-objects/AttemptStatus";
import { AttemptNumber } from "../value-objects/AttemptNumber";
import { Score } from "../value-objects/Score";
import { Duration } from "../value-objects/Duration";
import { SelectedOptions } from "../value-objects/SelectedOptions";

// State machine:
//   InProgress → Submitted  (student nộp bài)
//   InProgress → Expired    (hết thời gian, frontend auto-submit)
//   Submitted  → (terminal)
//   Expired    → (terminal)
//
// Cả Submitted và Expired đều chấm điểm:
//   - Câu đã trả lời → chấm đúng/sai bình thường
//   - Câu chưa trả lời → 0 điểm
//   - Chỉ khác nhau ở status cuối cùng
//
// Aggregate rules:
//   - StudentAnswers chỉ được tạo thông qua QuizAttempt
//   - Một attempt chứa nhiều câu trả lời
//   - Mỗi question chỉ được trả lời tối đa 1 lần (UNIQUE questionId)
//
// Cross-context data cần khi finalize (lấy từ Quiz Context qua IQuizQueryService):
//   - Danh sách questionId hợp lệ của quiz
//   - correctOptionIds cho mỗi question (để chấm điểm)
//   - pointsPerQuestion (maxScore / totalQuestions)
//   - timeLimit, deadline (để validate thời gian)

export class QuizAttempt {
  readonly attemptId: string;
  readonly quizId: string;
  readonly studentId: string;
  readonly sectionId: string;
  readonly attemptNumber: AttemptNumber;
  readonly startedAt: Date;

  private _status: AttemptStatus;
  private _submittedAt: Date | null;
  private _score: Score;
  private _answers: StudentAnswer[];

  constructor(params: {
    attemptId: string;
    quizId: string;
    studentId: string;
    sectionId: string;
    attemptNumber: AttemptNumber;
    status: AttemptStatus;
    startedAt: Date;
    submittedAt: Date | null;
    score: Score;
    answers: StudentAnswer[];
  }) {
    this.attemptId     = params.attemptId;
    this.quizId        = params.quizId;
    this.studentId     = params.studentId;
    this.sectionId     = params.sectionId;
    this.attemptNumber = params.attemptNumber;
    this.startedAt     = params.startedAt;
    this._status       = params.status;
    this._submittedAt  = params.submittedAt;
    this._score        = params.score;
    this._answers      = params.answers;
  }

  // Getters

  get status(): AttemptStatus          { return this._status; }
  get submittedAt(): Date | null       { return this._submittedAt; }
  get score(): Score                   { return this._score; }

  get answers(): ReadonlyArray<StudentAnswer> {
    return [...this._answers];
  }

  // Duration — chỉ có khi đã submit/expired
  get duration(): Duration | null {
    if (!this._submittedAt) return null;
    return Duration.fromTimestamps(this.startedAt, this._submittedAt);
  }

  // Tạo attempt mới (InProgress).
  // Các pre-condition check (enrollment, quiz published, max attempts)
  // được thực hiện ở Use Case trước khi gọi vào đây.
  //
  // now: từ IDateTimeProvider — nhất quán, testable
  static create(params: {
    quizId: string;
    studentId: string;
    sectionId: string;
    attemptNumber: AttemptNumber;
    maxScore: number;
    now: Date;
  }): QuizAttempt {
    return new QuizAttempt({
      attemptId:     uuidv4(),
      quizId:        params.quizId,
      studentId:     params.studentId,
      sectionId:     params.sectionId,
      attemptNumber: params.attemptNumber,
      status:        AttemptStatus.IN_PROGRESS,
      startedAt:     params.now,
      submittedAt:   null,
      score:         Score.zero(params.maxScore),
      answers:       [],
    });
  }

 // Validate thời gian trước khi chấm:
  //   - Chưa quá deadline
  //   - Chưa vượt timeLimit
  // Nếu vi phạm → throw, Use Case xử lý (có thể gọi expire thay thế)
  submit(params: {
    submittedAnswers: Map<string, string[]>;
    quizGradingData: {
      questions: Array<{ questionId: string; correctOptionIds: string[] }>;
      pointsPerQuestion: number;
    };
    now: Date;
    timeLimitMs: number | null;
    deadline: Date;
  }): void {
    this.assertInProgress();

    // Validate thời gian — chỉ submit mới check, expire thì bỏ qua
    if (params.now > params.deadline) {
      throw new Error(
        "DomainError: Không thể nộp bài — quiz đã quá deadline."
      );
    }
    if (params.timeLimitMs !== null) {
      const elapsed = params.now.getTime() - this.startedAt.getTime();
      if (elapsed > params.timeLimitMs) {
        throw new Error(
          "DomainError: Không thể nộp bài — đã vượt quá thời gian làm bài."
        );
      }
    }

    this.gradeAndFinalize(
      params.submittedAnswers,
      params.quizGradingData,
      params.now,
      AttemptStatus.SUBMITTED,
    );
  }

  // Frontend auto-submit khi hết thời gian.
  // Chấm điểm giống submit — câu đã làm thì chấm, chưa làm thì 0.
  // Chỉ khác: không validate thời gian (vì đã biết là hết giờ)
  // và status cuối = Expired thay vì Submitted.
  //
  // submittedAnswers: những câu student đã chọn trước khi hết giờ
  //   - Frontend gửi lên tại thời điểm detect hết giờ
  //   - Có thể rỗng (student chưa chọn câu nào) → score = 0
  expire(params: {
    submittedAnswers: Map<string, string[]>;
    quizGradingData: {
      questions: Array<{ questionId: string; correctOptionIds: string[] }>;
      pointsPerQuestion: number;
    };
    now: Date;
  }): void {
    if (this._status !== AttemptStatus.IN_PROGRESS) return; // idempotent

    this.gradeAndFinalize(
      params.submittedAnswers,
      params.quizGradingData,
      params.now,
      AttemptStatus.EXPIRED,
    );
  }

  // Private: chấm điểm + finalize attempt khi submit hoặc expire.
  //
  // Logic chung cho cả submit và expire:
  //   1. Duyệt từng question trong quiz
  //   2. Nếu student đã trả lời → chấm đúng/sai, tính điểm
  //   3. Nếu chưa trả lời → earnedPoints = 0
  //   4. Tính tổng điểm
  //   5. Đổi status + set submittedAt
  private gradeAndFinalize(
    submittedAnswers: Map<string, string[]>,
    gradingData: {
      questions: Array<{ questionId: string; correctOptionIds: string[] }>;
      pointsPerQuestion: number;
    },
    now: Date,
    finalStatus: AttemptStatus,
  ): void {
    const answers: StudentAnswer[] = [];

    console.log('[QuizAttempt.gradeAndFinalize] Starting grading process');
    console.log(`[QuizAttempt.gradeAndFinalize] Attempt: ${this.attemptId}`);
    console.log(`[QuizAttempt.gradeAndFinalize] Total questions to grade: ${gradingData.questions.length}`);
    console.log(`[QuizAttempt.gradeAndFinalize] Points per question: ${gradingData.pointsPerQuestion}`);

    for (const question of gradingData.questions) {
      const selectedOptionIds = submittedAnswers.get(question.questionId);

      console.log(`\n[QuizAttempt.gradeAndFinalize] Question: ${question.questionId}`);
      console.log(`  Correct options: [${question.correctOptionIds.join(', ')}]`);
      console.log(`  Student selected: [${selectedOptionIds?.join(', ') ?? '(none)'}]`);

      if (!selectedOptionIds || selectedOptionIds.length === 0) {
        // Câu chưa trả lời → tạo answer rỗng với 0 điểm
        console.log(`  Result: UNANSWERED → 0 points`);
        answers.push(
          StudentAnswer.createUnanswered(question.questionId)
        );
        continue;
      }

      // Câu đã trả lời → chấm đúng/sai
      const studentAnswer = StudentAnswer.create({
        questionId:        question.questionId,
        selectedOptions:   SelectedOptions.create(selectedOptionIds),
        correctOptionIds:  question.correctOptionIds,
        pointsPerQuestion: gradingData.pointsPerQuestion,
      });

      console.log(`  Result: ${studentAnswer.isCorrect ? 'CORRECT' : 'INCORRECT'} → ${studentAnswer.earnedPoints} points`);

      answers.push(studentAnswer);
    }

    this._answers     = answers;
    this._submittedAt = now;
    this._status      = finalStatus;

    // Tính tổng điểm từ tất cả answers
    const totalEarned = answers.reduce((sum, a) => sum + a.earnedPoints, 0);
    this._score = Score.create(totalEarned, this._score.maxScore);

    console.log(`\n[QuizAttempt.gradeAndFinalize] Grading summary:`);
    console.log(`  Total points earned: ${totalEarned} / ${this._score.maxScore}`);
    console.log(`  Correct answers: ${answers.filter(a => a.isCorrect).length} / ${answers.length}`);
  }

  // Guards 
  private assertInProgress(): void {
    if (this._status !== AttemptStatus.IN_PROGRESS) {
      throw new Error(
        `DomainError: Không thể thao tác trên attempt đã "${this._status}".`
      );
    }
  }

  isOwnedBy(studentId: string): boolean {
    return this.studentId === studentId;
  }
}