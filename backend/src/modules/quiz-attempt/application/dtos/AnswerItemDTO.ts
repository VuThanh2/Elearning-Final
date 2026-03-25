// Shared type — đại diện cho 1 câu trả lời của student trong 1 attempt.
//
// Dùng chung bởi SubmitAttemptDTO và ExpireAttemptDTO.
//
// selectedOptionIds: [] nếu student bỏ câu — hợp lệ, earnedPoints = 0.
export interface AnswerItemDTO {
  questionId:        string;
  selectedOptionIds: string[];
}