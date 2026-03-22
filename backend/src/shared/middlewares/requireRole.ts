import { Request, Response, NextFunction } from "express";
import { AuthorizationUseCase } from "../../modules/identity/application/use-cases/AuthorizationUseCase";
import { PermissionType } from "../../modules/identity/domain/value-objects/PermissionType";

// Kiểm tra user có permission cần thiết để truy cập route không.
// Phải chạy SAU requireAuthentication (cần req.user đã được set).
//
// Gọi AuthorizationUseCase.authorize() để:
//   - Load user mới nhất từ DB (đảm bảo isLocked luôn cập nhật)
//   - Kiểm tra permission của role
//
// Error mapping:
//   Unauthorized  → 401 (userId không còn tồn tại trong DB)
//   AccessDenied  → 403

export function requireRole(
  authorizationUseCase: AuthorizationUseCase,
  requiredPermission: PermissionType
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // req.user được set bởi requireAuthentication trước đó
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: Chưa xác thực." });
      return;
    }

    try {
      await authorizationUseCase.authorize(req.user.userId, requiredPermission);
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi phân quyền.";

      if (message.startsWith("Unauthorized:")) {
        res.status(401).json({ message });
        return;
      }
      res.status(403).json({ message });
    }
  };
}