import { IUserRepository } from "../../domain/interface-repositories/IUserRepository";
import { IPasswordHasher } from "../interfaces/IPasswordHasher";
import { ITokenProvider } from "../interfaces/ITokenProvider";
import { LoginDTO } from "../dtos/LoginDTO";
import { AuthTokenDTO } from "../dtos/AuthTokenDTO";
import { validateLoginDTO } from "../validators/LoginValidator";

// Xử lý 2 hành động: login và logout.
// Gộp chung 1 file vì cả 2 đều liên quan đến token lifecycle và dùng chung ITokenProvider.
//
// Constructor nhận 3 dependency qua interface:
//   userRepository   — tìm user từ DB
//   passwordHasher   — compare plain text với hash
//   tokenProvider    — tạo và invalidate JWT

export class AuthenticationUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenProvider: ITokenProvider
  ) {}

  // Main flow:
  //   1. Validate format input
  //   2. Tìm user theo email
  //   3. Verify password
  //   4. Tạo JWT token và trả về
  //
  // Lưu ý quan trọng về error message:
  //   Business rule "không tiết lộ thông tin nhạy cảm" — không
  //   phân biệt "email không tồn tại" với "sai password" mà dùng
  //   chung 1 lỗi "InvalidCredentials" cho cả 2 trường hợp.
  async login(dto: LoginDTO): Promise<AuthTokenDTO> {
    // Bước 1: validate format — throw ValidationError nếu sai
    validateLoginDTO(dto);

    // Bước 2: tìm user theo email
    const user = await this.userRepository.findByEmail(dto.email.trim());

    // Bước 3: verify password — dùng chung 1 lỗi cho cả "không tìm thấy
    // user" và "sai password" để không lộ thông tin
    const isPasswordValid =
      user !== null &&
      (await this.passwordHasher.compare(dto.password, user.passwordHash));

    if (!isPasswordValid) {
      throw new Error("InvalidCredentials: Thông tin đăng nhập không chính xác.");
    }

    // Bước 4: tạo JWT token và trả về AuthTokenDTO
    const accessToken = this.tokenProvider.generate({
      userId: user.userId,
      roleName: user.role.roleName,
    });

    return {
      accessToken,
      userId: user.userId,
      roleName: user.role.roleName,
    };
  }
  //Main flow:
  //   Invalidate token trên Redis — token này không dùng được nữa dù chưa hết hạn.
  //
  // Nhận token string trực tiếp vì controller đã extract từ
  // Authorization header trước khi gọi vào đây.
  async logout(token: string): Promise<void> {
    await this.tokenProvider.invalidate(token);
  }
}