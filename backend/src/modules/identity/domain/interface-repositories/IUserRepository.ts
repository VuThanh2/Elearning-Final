import { User } from "../entities/User";

// Không có create() / delete() vì:
//   - MVP: tài khoản được tạo sẵn bởi Admin (seed hoặc admin tool)

export interface IUserRepository {
  // Tìm user theo email — dùng khi login và reset password.
  // Trả về null nếu không tìm thấy (không throw để use case tự
  // quyết định trả lỗi gì, tránh lộ thông tin nhạy cảm).
  findByEmail(email: string): Promise<User | null>;

  // Tìm user theo userId — dùng khi verify JWT token ở middleware.
  // Trả về null nếu không tìm thấy.
  findById(userId: string): Promise<User | null>;

  // Persist thay đổi của user object xuống DB.
  // Dùng sau khi gọi user.changePassword().
  // Chỉ UPDATE, không INSERT.
  save(user: User): Promise<void>;
}