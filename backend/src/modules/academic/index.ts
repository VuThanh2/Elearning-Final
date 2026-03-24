import oracledb from "oracledb";
import { AcademicRepository }   from "./infrastructure/repositories/AcademicRepository";
import { AcademicQueryService } from "./application/services/AcademicQueryService";

// Entry point của Academic Context.
//
// Quy tắc:
//   - Module khác CHỈ được import từ file này
//   - Không được import thẳng vào bất kỳ file nào khác
//     bên trong academic/ (ví dụ: academic/infrastructure/...)
//
// Những gì được export ra ngoài:
//   - IAcademicQueryService  → interface để dùng trong Use Case (type-safe)
//   - createAcademicQueryService() → factory để wire dependency

export type { IAcademicQueryService } from "./application/interfaces/IAcademicQueryService";

// Academic Context tự wire dependency của mình.
// Caller chỉ cần truyền Oracle connection, không cần biết
// AcademicRepository hay bất kỳ thứ gì bên trong tồn tại.
export function createAcademicQueryService(
  connection: oracledb.Connection
): AcademicQueryService {
  const repository = new AcademicRepository(connection);
  return new AcademicQueryService(repository);
}