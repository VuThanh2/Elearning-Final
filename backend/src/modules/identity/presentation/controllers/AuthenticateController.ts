import { Request, Response } from "express";
import { AuthenticationUseCase } from "../../application/use-cases/AuthenticationUseCase";
import { ResetPasswordUseCase } from "../../application/use-cases/ResetPasswordUseCase";
import { LoginDTO } from "../../application/dtos/LoginDTO";
import { ResetPasswordDTO } from "../../application/dtos/ResetPasswordDTO";

// Trách nhiệm duy nhất: nhận HTTP request, gọi use case, trả response.
// Không có business logic ở đây.
//
// Request body được type bằng Express generic Request<P, ResBody, ReqBody>:
//   Request<{}, {}, LoginDTO>        — req.body là LoginDTO
//   Request<{}, {}, ResetPasswordDTO> — req.body là ResetPasswordDTO
//
// Error prefix → HTTP status:
//   ValidationError / PasswordMismatch / PasswordPolicyViolation → 400
//   InvalidCredentials / Unauthorized                            → 401
//   AccessDenied                                                 → 403
//   UserNotFound                                                 → 404
//   (other)                                                      → 500

export class AuthenticateController {
  constructor(
    private readonly authenticationUseCase: AuthenticationUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  // login — POST /auth/login
  //
  // Request body : LoginDTO     { email, password }
  // Response 200 : AuthTokenDTO { accessToken, userId, roleName }
  async login(
    req: Request<{}, {}, LoginDTO>,
    res: Response
  ): Promise<void> {
    try {
      const result = await this.authenticationUseCase.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đăng nhập.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }

  // logout — POST /auth/logout
  //
  // Request body : (empty) — token lấy từ req.token (set bởi middleware)
  // Response 200 : { message }
  async logout(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      await this.authenticationUseCase.logout(req.token!);
      res.status(200).json({ message: "Đăng xuất thành công." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đăng xuất.";
      res.status(500).json({ message });
    }
  }

  // resetPassword — POST /auth/reset-password
  //
  // Request body : ResetPasswordDTO { email, newPassword, confirmPassword }
  // Response 200 : { message }
  async resetPassword(
    req: Request<{}, {}, ResetPasswordDTO>,
    res: Response
  ): Promise<void> {
    try {
      await this.resetPasswordUseCase.execute(req.body);
      res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi đặt lại mật khẩu.";
      res.status(mapErrorToStatus(message)).json({ message });
    }
  }
}

// mapErrorToStatus — private helper
//
// Map error message prefix → HTTP status code.
// Tập trung tại 1 chỗ — thêm error mới chỉ sửa ở đây.
function mapErrorToStatus(message: string): number {
  if (message.startsWith("ValidationError:"))         return 400;
  if (message.startsWith("PasswordMismatch:"))        return 400;
  if (message.startsWith("PasswordPolicyViolation:")) return 400;
  if (message.startsWith("InvalidCredentials:"))      return 401;
  if (message.startsWith("Unauthorized:"))            return 401;
  if (message.startsWith("AccessDenied:"))            return 403;
  if (message.startsWith("UserNotFound:"))            return 404;
  return 500;
}