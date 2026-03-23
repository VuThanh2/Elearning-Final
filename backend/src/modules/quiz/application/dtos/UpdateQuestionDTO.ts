// Quiz phải ở trạng thái Draft hoặc Hidden.
// questionId lấy từ URL param (:questionId).
//
// Chỉ cho phép sửa content — questionType KHÔNG thể thay đổi
// sau khi câu hỏi đã được tạo vì sẽ invalidate các answer options
// hiện có (ví dụ: từ MultipleChoice sang Coding thì options cũ
// không còn ý nghĩa). Nếu cần đổi type, Teacher xóa câu hỏi và tạo lại.
export interface UpdateQuestionDTO {
  content: string;
}