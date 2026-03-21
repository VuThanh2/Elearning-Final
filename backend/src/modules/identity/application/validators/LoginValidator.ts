import { LoginDTO } from "../dtos/LoginDTO";

//kiểm tra format/shape của LoginDTO trước khi AuthenticationUseCase xử lý.
//
// Validator chỉ check những gì có thể biết từ input mà KHÔNG cần
// truy vấn DB:
//   ✓ email có rỗng không
//   ✓ email có đúng format không
//   ✓ password có rỗng không
//
// Validator KHÔNG check:
//   ✗ email có tồn tại trong DB không 
//   ✗ password có đúng không        
//   ✗ tài khoản có bị khoá không     

export function validateLoginDTO(dto: LoginDTO): void {
  if (!dto.email || dto.email.trim().length === 0) {
    throw new Error("ValidationError: Email không được để trống.");
  }

  // Kiểm tra format email cơ bản — đủ để loại bỏ input rõ ràng sai trước khi query DB
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(dto.email.trim())) {
    throw new Error("ValidationError: Email không đúng định dạng.");
  }

  if (!dto.password || dto.password.length === 0) {
    throw new Error("ValidationError: Password không được để trống.");
  }
}