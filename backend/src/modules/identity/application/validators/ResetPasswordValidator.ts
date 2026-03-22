import { ResetPasswordDTO } from "../dtos/ResetPasswordDTO";

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

  // Check PasswordMismatch trước password policy — trả lỗi rõ ràng hơn
  // cho user khi họ gõ nhầm confirm password
  if (dto.newPassword !== dto.confirmPassword) {
    throw new Error("PasswordMismatch: Mật khẩu xác nhận không khớp.");
  }

  if (dto.newPassword.length < 8) {
    throw new Error("PasswordPolicyViolation: Mật khẩu phải có ít nhất 8 ký tự.");
  }

  if (!/[A-Z]/.test(dto.newPassword)) {
    throw new Error("PasswordPolicyViolation: Mật khẩu phải có ít nhất 1 chữ hoa.");
  }

  if (!/[0-9]/.test(dto.newPassword)) {
    throw new Error("PasswordPolicyViolation: Mật khẩu phải có ít nhất 1 chữ số.");
  }
}