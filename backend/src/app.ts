import express from "express";

// app.ts có trách nhiệm duy nhất: cấu hình Express application.
// Không chứa logic kết nối DB, không mount routes, không start server.
// Tất cả những thứ đó thuộc về server.ts (bootstrap layer).
//
// Tách app.ts khỏi server.ts để:
//   - Test integration dễ hơn: import app mà không start server thật
//   - Separation of concern rõ ràng giữa "cấu hình app" và "khởi động"
const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Parse JSON body cho tất cả request
app.use(express.json({ limit: "1mb" }));

export default app;