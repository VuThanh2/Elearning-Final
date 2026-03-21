//Interface cho việc quản lý JWT token

// Payload được nhúng vào token:
//   userId   — để middleware load user từ DB khi cần
//   roleName — để middleware check role nhanh mà không cần query DB

export interface TokenPayload {
  userId: string;
  roleName: string;
}

export interface ITokenProvider {
  // Tạo JWT token sau khi login thành công.
  generate(payload: TokenPayload): string;

  // Giải mã và xác thực token từ request header.
  // Trả về payload nếu hợp lệ, null nếu token sai / hết hạn /
  // đã bị blacklist (logout rồi).
  verify(token: string): TokenPayload | null;

  // Đưa token vào blacklist trên Redis — token này không dùng được nữa.
  // Dùng trong: AuthenticationUseCase khi user logout.
  invalidate(token: string): Promise<void>;
}