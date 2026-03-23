import { QuestionType } from "../../domain/value-objects/QuestionType";
import { AnswerOptionDTO } from "./AnswerOptionDTO";

// Quiz phải ở trạng thái Draft hoặc Hidden.
// questionId được domain tự sinh (UUID) — không nhận từ client.
//
// answerOptions là optional ở đây vì Teacher có thể:
//   1. Thêm câu hỏi trước → thêm options sau (2 request riêng)
//   2. Thêm câu hỏi kèm options luôn trong 1 request (tiện hơn)
// Cả hai flow đều hợp lệ — invariant chỉ được enforce lúc publish.
//
// Dùng lại AnswerOptionDTO cho inline options — khi Add inline,
// validator sẽ check content và isCorrect phải có (not undefined).

export interface AddQuestionDTO {
  content:        string;
  questionType:   QuestionType;
  answerOptions?: AnswerOptionDTO[];
}