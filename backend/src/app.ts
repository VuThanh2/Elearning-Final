import express      from "express";
import cors         from "cors";
import helmet       from "helmet";
import morgan       from "morgan";
import rateLimit    from "express-rate-limit";

// app.ts — Application-level Gateway
//
// Trách nhiệm: cấu hình toàn bộ cross-cutting concerns trước
// khi request đến bất kỳ route nào.
//
// Tách app.ts khỏi server.ts để:
//   - Integration test: import app mà không start server thật
//   - Separation of concern: "cấu hình app" vs "khởi động server"
//
// Middleware pipeline (thứ tự quan trọng):
//   1. Helmet       — bảo mật HTTP headers
//   2. CORS         — cho phép React frontend gọi API
//   3. Rate Limiter — chống brute-force / DDoS
//   4. Morgan       — HTTP request logging
//   5. JSON parser  — parse request body
//   6. Routes       — mount trong server.ts
//   7. 404 handler  — catch route không tồn tại
//   8. Error handler — catch lỗi unhandled từ route

const app = express();

// 1. HELMET — Bảo mật HTTP response headers 
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production",
    crossOriginEmbedderPolicy: false, // tắt để tránh conflict với CORS
  }),
);

// 2. CORS — Cho phép React Frontend gọi API 
// ALLOWED_ORIGINS trong .env:
//   Dev:        http://localhost:5173  (Vite default)
//   Production: https://yourdomain.com
//
// credentials: true — bắt buộc vì frontend gửi Authorization header (JWT).
// Nếu không set credentials: true, browser sẽ block preflight OPTIONS.
//
// Cách set ALLOWED_ORIGINS trong .env:
//   ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
const rawOrigins = process.env.ALLOWED_ORIGINS ?? "http://localhost:5173";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép server-to-server (Postman, curl) không có origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin "${origin}" không được phép.`));
      }
    },
    credentials: true,                      // cho phép Authorization header
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-RateLimit-Remaining"], // FE có thể đọc rate limit còn lại
    maxAge: 86400,                            // cache preflight 24h (giảm OPTIONS requests)
  }),
);

// 3. RATE LIMITER — Chống brute-force và DDoS 
// Có 2 limiter riêng biệt:
//
//   authLimiter   — áp dụng cho /auth/* (login, reset-password)
//                   Giới hạn chặt hơn vì đây là mục tiêu brute-force chính.
//                   Nếu login sai quá nhiều lần → 429 Too Many Requests.
//
//   globalLimiter — áp dụng cho toàn bộ API còn lại
//                   Ngưỡng cao hơn để không block user bình thường.
//
// windowMs: 15 phút — mỗi IP được tính trong cửa sổ 15 phút
// max:       số request tối đa trong cửa sổ đó
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,                   // tối đa 20 request / IP / 15 phút cho auth
  message: {
    message: "Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau 15 phút.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 300,                  // tối đa 300 request / IP / 15 phút cho API thường
  message: {
    message: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth routes luôn bị rate limit chặt, bất kể thứ tự mount trong server.ts
app.use("/auth", authLimiter);

// Global limiter cho toàn bộ API
app.use(globalLimiter);

// 4. MORGAN — HTTP Request Logging 
//
// Dev: "dev" format — màu sắc, ngắn gọn, dễ đọc trên terminal
//   GET /auth/login 200 45ms
//
// Production: "combined" format — Apache Combined Log, phù hợp với log aggregators
//   ::1 - - [29/Mar/2026] "POST /auth/login HTTP/1.1" 200 128
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// 5. BODY PARSER 
//
// limit: "1mb" — giới hạn request body size.
// Quan trọng: đặt SAU helmet/cors/rate-limit để các middleware đó không phải
// parse body trước khi quyết định reject request.
app.use(express.json({ limit: "1mb" }));

// 7. 404 Handler 
//
// Chạy khi không có route nào match.
// Đặt CUỐI CÙNG sau khi server.ts đã mount tất cả routes.
export function notFoundHandler(
  req: express.Request,
  res: express.Response,
): void {
  res.status(404).json({
    message: `Route "${req.method} ${req.originalUrl}" không tồn tại.`,
  });
}

// 8. Global Error Handler 
//
// Express nhận ra error handler bằng signature 4 tham số: (err, req, res, next)
// Bắt tất cả lỗi được next(err) từ bất kỳ route hoặc middleware nào.
//
// Phân loại lỗi:
//   - CORS error (từ cors() middleware)    → 403 Forbidden
//   - Lỗi validation JSON body malformed   → 400 Bad Request
//   - Lỗi chưa xử lý còn lại              → 500 Internal Server Error
export function globalErrorHandler(
  err: Error,
  req: express.Request,
  res: express.Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: express.NextFunction,
): void {
  // CORS error — origin không được phép
  if (err.message.startsWith("CORS:")) {
    res.status(403).json({ message: err.message });
    return;
  }

  // JSON parse error — body malformed (ví dụ: bị cắt giữa chừng)
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "Request body không đúng định dạng JSON." });
    return;
  }

  // Lỗi chưa xử lý — log chi tiết phía server, trả về thông báo chung
  console.error("[GlobalErrorHandler]", {
    method:  req.method,
    url:     req.originalUrl,
    message: err.message,
    stack:   process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  res.status(500).json({
    message:
      process.env.NODE_ENV !== "production"
        ? err.message
        : "Đã xảy ra lỗi phía server. Vui lòng thử lại sau.",
  });
}

export default app;