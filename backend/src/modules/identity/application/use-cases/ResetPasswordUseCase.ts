import { IUserRepository } from "../../domain/interface-repositories/IUserRepository";
import { IPasswordHasher } from "../interfaces/IPasswordHasher";
import { Password } from "../../domain/value-objects/Password";
import { ResetPasswordDTO } from "../dtos/ResetPasswordDTO";
import { validateResetPasswordDTO } from "../validators/ResetPasswordValidator";

// Flow public — user chưa đăng nhập có thể tự reset password
// bằng cách cung cấp email + password mới.
//
// Endpoint này KHÔNG yêu cầu authentication (public route).
//
// Trade-off đã được chấp nhận:
//   Bất kỳ ai biết email của người khác đều có thể reset password
//   của họ. Chấp nhận được trong scope hệ thống trường học khép kín

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<void> {
    // Bước 1: validate format, policy, confirm match
    validateResetPasswordDTO(dto);

    // Bước 2: tìm user theo email
    const user = await this.userRepository.findByEmail(dto.email.trim());

    // Không lộ "email có tồn tại không" vì endpoint này public —
    // trả về silent success thay vì throw UserNotFound
    if (!user) return;

    // Bước 3: validate policy qua value object, hash password mới
    Password.create(dto.newPassword);
    const newHash = await this.passwordHasher.hash(dto.newPassword);

    // Bước 4: cập nhật password trên entity rồi persist
    user.changePassword(Password.fromHash(newHash));
    await this.userRepository.save(user);
  }
}