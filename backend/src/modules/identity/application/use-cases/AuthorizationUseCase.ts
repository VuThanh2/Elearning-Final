import { IUserRepository } from "../../domain/interface-repositories/IUserRepository";
import { PermissionType } from "../../domain/value-objects/PermissionType";

// Main flow:
//   1. Load user từ userId (đã có từ JWT payload)
//   2. Kiểm tra user có permission tương ứng không

export class AuthorizationUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  // Trả về void nếu hợp lệ, throw nếu không.
  // Middleware bắt lỗi và trả HTTP 401 / 403 tương ứng.
  //
  // userId: lấy từ JWT payload sau khi verify ở requireAuthentication
  // requiredPermission: permission mà route đó yêu cầu
  async authorize(
    userId: string,
    requiredPermission: PermissionType
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      // userId trong JWT không còn tồn tại trong DB
      throw new Error("Unauthorized: Tài khoản không tồn tại.");
    }

    // Kiểm tra permission — dựa vào role của user
    if (!user.hasPermission(requiredPermission)) {
      throw new Error(
        `AccessDenied: Không có quyền thực hiện "${requiredPermission}".`
      );
    }
  }
}