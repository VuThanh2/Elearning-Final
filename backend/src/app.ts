import express from "express";

// app.ts có trách nhiệm duy nhất: cấu hình Express application.
// Không chứa logic kết nối DB, không mount routes, không start server.
// Tất cả những thứ đó thuộc về server.ts (bootstrap layer).
//
// Tách app.ts khỏi server.ts để:
//   - Test integration dễ hơn: import app mà không start server thật
//   - Separation of concern rõ ràng giữa "cấu hình app" và "khởi động"
const app = express();

// Parse JSON body cho tất cả request
app.use(express.json({ limit: "1mb" }));

export default app;