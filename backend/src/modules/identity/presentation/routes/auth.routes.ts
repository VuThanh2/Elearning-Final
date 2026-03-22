import { Router } from "express";
import oracledb from "oracledb";
import { RedisClientType } from "redis";
import { AuthenticateController } from "../controllers/AuthenticateController";
import { AuthenticationUseCase } from "../../application/use-cases/AuthenticationUseCase";
import { AuthorizationUseCase } from "../../application/use-cases/AuthorizationUseCase";
import { ResetPasswordUseCase } from "../../application/use-cases/ResetPasswordUseCase";
import { UserRepository } from "../../infrastructure/repositories/UserRepository";
import { BcryptPasswordHasher } from "../../infrastructure/providers/BcryptPasswordHasher";
import { JwtTokenProvider } from "../../infrastructure/providers/JwtTokenProvider";
import { requireAuthentication } from "../../../../shared/middlewares/requireAuthentication";

// Đây là nơi DI (Dependency Injection) được wire thủ công:
//   Infrastructure (Repository, Provider)
//     → Application (Use Case)
//       → Presentation (Controller)
//         → Route
//
// Nhận oracleConnection và redisClient từ bên ngoài (server.ts) thay vì tự tạo bên trong — lý do:
//   - Dùng chung connection/client đã được khởi tạo ở server startup
//   - Không tạo connection mới cho mỗi request
//
// Routes:
//   POST /auth/login          — public
//   POST /auth/logout         — protected (requireAuthentication)
//   POST /auth/reset-password — public

export function createAuthRouter(
  oracleConnection: oracledb.Connection,
  redisClient: RedisClientType
): Router {
  const router = Router();

  //Khởi tạo infrastructure layer
  const userRepository    = new UserRepository(oracleConnection);
  const passwordHasher    = new BcryptPasswordHasher();
  const tokenProvider     = new JwtTokenProvider(redisClient);

  //Khởi tạo application layer
  const authenticationUseCase = new AuthenticationUseCase(
    userRepository,
    passwordHasher,
    tokenProvider
  );
  const authorizationUseCase = new AuthorizationUseCase(userRepository);
  const resetPasswordUseCase = new ResetPasswordUseCase(userRepository, passwordHasher);

  //Khởi tạo presentation layer 
  const controller = new AuthenticateController(authenticationUseCase, resetPasswordUseCase);

  //Middleware 
  const authenticate = requireAuthentication(tokenProvider);

  // POST /auth/login — public
  // Body: { email, password }
  router.post("/login", (req, res) => controller.login(req, res));

  // POST /auth/logout — protected
  // Header: Authorization: Bearer <token>
  router.post("/logout", authenticate, (req, res) => controller.logout(req, res));

  // POST /auth/reset-password — public
  // Body: { email, newPassword, confirmPassword }
  router.post("/reset-password", (req, res) => controller.resetPassword(req, res));

  return router;
}