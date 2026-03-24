import { v4 as uuidv4 } from "uuid";
import { SelectedOptions } from "../value-objects/SelectedOptions";

// Entity con thuộc QuizAttempt aggregate — chỉ được tạo/truy cập
// thông qua QuizAttempt, không bao giờ tồn tại độc lập.
//
// Trách nhiệm:
//   - Lưu đáp án student đã chọn
//   - Lưu kết quả đúng/sai và điểm kiếm được
//
// isCorrect và earnedPoints được tính tại thời điểm submit,
// không thay đổi sau đó.

export class StudentAnswer {
  readonly answerId: string;
  readonly questionId: string;
  readonly selectedOptions: SelectedOptions;
  readonly isCorrect: boolean;
  readonly earnedPoints: number;

  constructor(params: {
    answerId: string;
    questionId: string;
    selectedOptions: SelectedOptions;
    isCorrect: boolean;
    earnedPoints: number;
  }) {
    this.answerId        = params.answerId;
    this.questionId      = params.questionId;
    this.selectedOptions = params.selectedOptions;
    this.isCorrect       = params.isCorrect;
    this.earnedPoints    = params.earnedPoints;
  }

  // Params:
  //   questionId      — câu hỏi đang chấm
  //   selectedOptions — đáp án student đã chọn
  //   correctOptionIds — đáp án đúng (lấy từ Quiz Context)
  //   pointsPerQuestion — điểm mỗi câu (maxScore / totalQuestions)
  static create(params: {
    questionId: string;
    selectedOptions: SelectedOptions;
    correctOptionIds: string[];
    pointsPerQuestion: number;
  }): StudentAnswer {
    const isCorrect = params.selectedOptions.isCorrect(params.correctOptionIds);

    return new StudentAnswer({
      answerId:        uuidv4(),
      questionId:      params.questionId,
      selectedOptions: params.selectedOptions,
      isCorrect,
      earnedPoints:    isCorrect ? params.pointsPerQuestion : 0,
    });
  }

  // Câu chưa trả lời — student bỏ trống hoặc hết giờ chưa kịp chọn.
  // Tạo answer rỗng với 0 điểm để đảm bảo mỗi question đều có
  // record trong attempt (dễ cho analytics đếm đủ).
  static createUnanswered(questionId: string): StudentAnswer {
    return new StudentAnswer({
      answerId:        uuidv4(),
      questionId,
      selectedOptions: SelectedOptions.fromPersisted([]),
      isCorrect:       false,
      earnedPoints:    0,
    });
  }
}