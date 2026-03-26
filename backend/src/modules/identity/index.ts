import oracledb          from "oracledb";
import { RedisClientType } from "redis";

import { UserRepository }        from "./infrastructure/repositories/UserRepository";
import { BcryptPasswordHasher }  from "./infrastructure/providers/BcryptPasswordHasher";
import { JwtTokenProvider }      from "./infrastructure/providers/JwtTokenProvider";
import { AuthenticationUseCase } from "./application/use-cases/AuthenticationUseCase";
import { AuthorizationUseCase }  from "./application/use-cases/AuthorizationUseCase";
import { ResetPasswordUseCase }  from "./application/use-cases/ResetPasswordUseCase";

// Entry point của Identity Context.
//
// Quy tắc:
//   - Module khác CHỈ được import từ file này
//   - Không được import thẳng vào bất kỳ file nào bên trong identity/
//     (ví dụ: identity/application/use-cases/..., identity/domain/...)
//
// NHÓM 1 — Types cho shared/middlewares/requireAuthentication
export type { ITokenProvider } from "./application/interfaces/ITokenProvider";
export type { TokenPayload }   from "./application/interfaces/ITokenProvider";

// NHÓM 2 — Types cho shared/middlewares/requireRole
//
// AuthorizationUseCase: concrete class được export vì:
//   - requireRole nhận nó làm tham số constructor — caller cần biết class này
//     để tạo instance và inject vào
//   - Không tạo interface wrapper (IAuthorizationUseCase) vì đây là
//     use case đơn giản, wrapper sẽ thêm boilerplate không có giá trị
//   - Pattern nhất quán: caller (server.ts / route files) tự wire DI
//     thay vì Identity Context tự tạo và inject
export { PermissionType }        from "./domain/value-objects/PermissionType";
export { AuthorizationUseCase }  from "./application/use-cases/AuthorizationUseCase";

// Tạo AuthorizationUseCase đã wire sẵn UserRepository.
// Dùng bởi: server.ts khi tạo requireRole middleware.
export function createAuthorizationUseCase(
  connection: oracledb.Connection,
): AuthorizationUseCase {
  const userRepository = new UserRepository(connection);
  return new AuthorizationUseCase(userRepository);
}

// Tạo JwtTokenProvider đã wire sẵn Redis.
// Dùng bởi: server.ts khi tạo requireAuthentication middleware.
export function createTokenProvider(
  redisClient: RedisClientType,
): JwtTokenProvider {
  return new JwtTokenProvider(redisClient);
}

// Tạo toàn bộ Identity use cases để auth.routes.ts dùng.
// Tách riêng vì auth.routes.ts cần nhiều use case hơn (Authentication + ResetPassword),
// không chỉ Authorization.
export function createIdentityUseCases(
  connection:  oracledb.Connection,
  redisClient: RedisClientType,
) {
  const userRepository   = new UserRepository(connection);
  const passwordHasher   = new BcryptPasswordHasher();
  const tokenProvider    = new JwtTokenProvider(redisClient);

  return {
    authenticationUseCase: new AuthenticationUseCase(
      userRepository,
      passwordHasher,
      tokenProvider,
    ),
    authorizationUseCase: new AuthorizationUseCase(userRepository),
    resetPasswordUseCase: new ResetPasswordUseCase(
      userRepository,
      passwordHasher,
    ),
    tokenProvider,
  };
}