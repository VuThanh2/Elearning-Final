// Quy tắc nhất quán với toàn project:
//   Module ngoài CHỈ được import từ file này.
//   Mọi thứ bên trong analytics/ là internal — không ai import thẳng vào.
//
// Tuy nhiên, "module ngoài" ở đây thực tế chỉ có đúng 1 nơi:
//   server.ts — cần factory function để wire DI khi bootstrap.
//
// Read Model types cũng không cần export ra đây.
//   Không có context nào khác (Identity, Quiz, Academic, QuizAttempt)
//   cần biết về QuizPerformanceView hay AtRiskStudentView.
//   Analytics là context đầu cuối — chỉ nhận event vào, không phát ra ngoài.
//
// Vì vậy index.ts này chỉ export đúng 1 thứ có ý nghĩa cross-context:
//   createAnalyticsQueryService() — factory để server.ts wire DI.

// TODO: Uncomment khi Application và Infrastructure layer được implement.
//
// import oracledb from "oracledb";
// import { AnalyticsOracleRepository } from "./infrastructure/repositories/AnalyticsOracleRepository";
// import { AnalyticsMongoRepository }  from "./infrastructure/repositories/AnalyticsMongoRepository";
// import { AnalyticsQueryService }     from "./application/services/AnalyticsQueryService";
//
// Nhận oracleConnection từ server.ts (dùng chung, không tạo mới).
// MongoDB không cần truyền vào — dùng Mongoose global connection
// giống Quiz Context và QuizAttempt Context.
//
// export function createAnalyticsQueryService(
//   oracleConnection: oracledb.Connection,
// ): AnalyticsQueryService {
//   const oracleRepo = new AnalyticsOracleRepository(oracleConnection);
//   const mongoRepo  = new AnalyticsMongoRepository();
//   return new AnalyticsQueryService(oracleRepo, mongoRepo);
// }