import bcrypt from "bcryptjs";
import { IPasswordHasher } from "../../application/interfaces/IPasswordHasher";

// BcryptPasswordHasher — Implementation của IPasswordHasher
//
// SALT_ROUNDS = 10 là giá trị cân bằng giữa security và performance.
//   - Thấp hơn (< 10): hash nhanh nhưng dễ brute force hơn
//   - Cao hơn (> 12): an toàn hơn nhưng tốn CPU, ảnh hưởng response time
//   - 10 là convention phổ biến cho production

const SALT_ROUNDS = 10;

export class BcryptPasswordHasher implements IPasswordHasher {

  // Plain text → bcrypt hash để lưu vào DB.
  // Dùng trong: ResetPasswordUseCase sau khi Password.create() validate xong.
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  // So sánh plain text với hash đã lưu trong DB.
  // bcrypt.compare tự extract salt từ hash nên không cần truyền salt riêng.
  // Dùng trong: AuthenticationUseCase để verify password lúc login.
  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}