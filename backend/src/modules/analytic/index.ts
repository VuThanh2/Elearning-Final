import { EventEmitter } from "events";
import oracledb         from "oracledb";
import { RequestHandler } from "express";

// Quy tắc nhất quán với toàn project:
//   Module ngoài CHỈ được import từ file này.
//   Mọi thứ bên trong analytics/ là internal — không ai import thẳng vào.
//
// "Module ngoài" của Analytics Context chỉ có đúng 1 nơi: server.ts.
//   server.ts cần 2 thứ từ Analytics:
//     1. createAnalyticsRouter()           — mount HTTP routes
//     2. createAnalyticsEventSubscriber()  — register event listeners
//   server.ts chỉ cần factory để wire DI — không cần biết implementation bên trong.
export { createAnalyticsRouter }         from "./presentation/routes/analytic.routes";
export { createAnalyticsEventSubscriber } from "./infrastructure/providers/AnalyticsEventSubscriber";
 
// Re-export type AnalyticsEventSubscriber để server.ts có thể type-check
// biến lưu subscriber instance mà không cần import thẳng từ infrastructure.
export type { AnalyticsEventSubscriber } from "./infrastructure/providers/AnalyticsEventSubscriber";