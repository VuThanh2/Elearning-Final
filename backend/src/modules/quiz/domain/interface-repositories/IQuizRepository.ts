import { Quiz } from "../entities/Quiz";

// Không có delete() vì:
//   Business rule: không được xóa quiz đã có attempt
//   → thay bằng hide() trên Quiz entity

export interface IQuizRepository {
  // Tìm quiz theo quizId — null nếu không tồn tại
  findById(quizId: string): Promise<Quiz | null>;

  // Tìm tất cả quiz của một Teacher trong một Section
  findByTeacherAndSection(teacherId: string, sectionId: string): Promise<Quiz[]>;

  // Tìm tất cả quiz Published trong một Section —
  // dùng bởi Quiz Attempt Context (qua integration provider)
  findPublishedBySection(sectionId: string): Promise<Quiz[]>;

  // Lưu quiz (insert hoặc update — upsert theo quizId)
  save(quiz: Quiz): Promise<void>;

  // Kiểm tra có tồn tại quiz nào của Teacher trong Section không
  // Dùng khi validate TeachingAssignment trước khi tạo quiz
  existsByTeacherAndSection(teacherId: string, sectionId: string): Promise<boolean>;
}