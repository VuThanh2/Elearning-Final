// studentId KHÔNG nằm trong DTO — lấy từ JWT payload (req.user.userId).
//
// quizId lấy từ URL param (:quizId), không phải từ body.
// File này tồn tại để document rõ shape của request — use case
// nhận (studentId, quizId) trực tiếp từ controller, không qua DTO object.
//
// Tuy nhiên để nhất quán với pattern DTO trong project, khai báo interface
// để controller có thể type-check req.params shape.
export interface StartAttemptDTO {
  quizId: string; // lấy từ req.params.quizId
}