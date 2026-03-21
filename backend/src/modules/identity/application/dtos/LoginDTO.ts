// Nhận dữ liệu thô từ HTTP request body, chưa qua validate.
// Validator (LoginValidator.ts) sẽ kiểm tra trước khi use case dùng.
export interface LoginDTO {
  email: string;
  password: string;
}