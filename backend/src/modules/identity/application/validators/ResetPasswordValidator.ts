import { ResetPasswordDTO } from "../dtos/ResetPasswordDTO";
import { Password } from "../../domain/value-objects/Password";

// Validator chỉ check những gì có thể biết từ input mà KHÔNG cần truy vấn DB:
//   ✓ email có rỗng không
//   ✓ email có đúng format không
//   ✓ newPassword có rỗng không
//   ✓ confirmPassword có rỗng không
//   ✓ newPassword và confirmPassword có khớp không  → PasswordMismatch
//   ✓ newPassword có đạt password policy không      → PasswordPolicyViolation
//
// Validator KHÔNG check:
//   ✗ email có tồn tại trong DB không    → use case (findByEmail)

export function validateResetPasswordDTO(dto: ResetPasswordDTO): void {
  if (!dto.email || dto.email.trim().length === 0) {
    throw new Error("ValidationError: Email không được để trống.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(dto.email.trim())) {
    throw new Error("ValidationError: Email không đúng định dạng.");
  }

  if (!dto.newPassword || dto.newPassword.length === 0) {
    throw new Error("ValidationError: Mật khẩu mới không được để trống.");
  }

  if (!dto.confirmPassword || dto.confirmPassword.length === 0) {
    throw new Error("ValidationError: Xác nhận mật khẩu không được để trống.");
  }

  // Check confirm password match new password trước để tránh gọi Password.create() không cần thiết nếu 2 mật khẩu không khớp
  if (dto.newPassword !== dto.confirmPassword) {
    throw new Error("PasswordMismatch: Mật khẩu xác nhận không khớp.");
  }

  // Delegate password policy cho domain value object —
  // nguồn duy nhất cho business rule về password
  Password.create(dto.newPassword);
}