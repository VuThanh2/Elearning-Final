import { Quiz } from "../entities/Quiz";

// delete() 仅用于Draft和Hidden状态的quiz （未发布或已隐藏）
// Business rule: 不允许删除已有attempt的quiz
// → 改用hide()在Quiz entity上

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

  // Xóa quiz (chỉ cho Draft và Hidden status, không có attempt)
  delete(quizId: string): Promise<void>;

  // Kiểm tra có tồn tại quiz nào của Teacher trong Section không
  // Dùng khi validate TeachingAssignment trước khi tạo quiz
  existsByTeacherAndSection(teacherId: string, sectionId: string): Promise<boolean>;
}