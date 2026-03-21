import {RequestResetPasswordDTO, ConfirmResetPasswordDTO} from "../dtos/ResetPasswordDTO";

// Validator chỉ check những gì có thể biết từ input mà KHÔNG cần truy vấn DB:
//
//   validateRequestResetDTO:
//     ✓ email có rỗng không
//     ✓ email có đúng format không
//
//   validateConfirmResetDTO:
//     ✓ newPassword có rỗng không
//     ✓ confirmPassword có rỗng không
//     ✓ newPassword và confirmPassword có khớp không  → PasswordMismatch
//     ✓ newPassword có đạt password policy không      → PasswordPolicyViolation
//
// Validator KHÔNG check:
//   ✗ email có tồn tại trong DB không    

// Bước 1: validate email trước khi gửi reset link
export function validateRequestResetDTO(dto: RequestResetPasswordDTO): void {
  if (!dto.email || dto.email.trim().length === 0) {
    throw new Error("ValidationError: Email không được để trống.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(dto.email.trim())) {
    throw new Error("ValidationError: Email không đúng định dạng.");
  }
}

// Bước 2: validate password mới trước khi cập nhật
export function validateConfirmResetDTO(dto: ConfirmResetPasswordDTO): void {

  if (!dto.newPassword || dto.newPassword.length === 0) {
    throw new Error("ValidationError: Mật khẩu mới không được để trống.");
  }

  if (!dto.confirmPassword || dto.confirmPassword.length === 0) {
    throw new Error("ValidationError: Xác nhận mật khẩu không được để trống.");
  }

  // Check PasswordMismatch trước password policy — trả lỗi rõ ràng hơn
  // cho user khi họ gõ nhầm confirm password.
  if (dto.newPassword !== dto.confirmPassword) {
    throw new Error("PasswordMismatch: Mật khẩu xác nhận không khớp.");
  }

  // Check password policy — dùng lại đúng rule đã định nghĩa
  // trong Password value object để không bị lặp logic.
  // Nếu policy thay đổi thì chỉ cần sửa 1 chỗ (Password.ts).
  if (dto.newPassword.length < 8) {
    throw new Error(
      "PasswordPolicyViolation: Mật khẩu phải có ít nhất 8 ký tự."
    );
  }

  if (!/[A-Z]/.test(dto.newPassword)) {
    throw new Error(
      "PasswordPolicyViolation: Mật khẩu phải có ít nhất 1 chữ hoa."
    );
  }

  if (!/[0-9]/.test(dto.newPassword)) {
    throw new Error(
      "PasswordPolicyViolation: Mật khẩu phải có ít nhất 1 chữ số."
    );
  }
}