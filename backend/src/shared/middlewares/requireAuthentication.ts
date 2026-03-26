import { Request, Response, NextFunction } from "express";
import { ITokenProvider, TokenPayload } from "../../modules/identity";

// Chặn mọi request không có JWT hợp lệ.
// Chạy TRƯỚC requireRole trên các protected route.
//
// Flow:
//   1. Lấy token từ Authorization header (format: "Bearer <token>")
//   2. Verify token qua ITokenProvider (check signature + blacklist)
//   3. Gắn payload vào req.user để middleware/handler sau dùng
//
// Nếu token không hợp lệ → 401 Unauthorized, không đi tiếp.

// Mở rộng Express Request để thêm field user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      // token gốc — cần khi logout để invalidate
      token?: string;
    }
  }
}

export function requireAuthentication(tokenProvider: ITokenProvider) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // Authorization header phải có format: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: Thiếu token xác thực." });
      return;
    }

    const token = authHeader.split(" ")[1];

    //Kiểm tra token có thực sự tồn tại sau khi tách chuỗi không
    if (!token) {
      res.status(401).json({ message: "Unauthorized: Token không đúng định dạng." });
      return;
    }

    // Verify token — check signature, expiry và Redis blacklist
    const payload = await tokenProvider.verify(token);

    if (!payload) {
      res.status(401).json({ message: "Unauthorized: Token không hợp lệ hoặc đã hết hạn." });
      return;
    }

    // Gắn payload và token gốc vào request để handler sau dùng
    req.user = payload;
    req.token = token;

    next();
  };
}