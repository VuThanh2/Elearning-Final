import { AcademicUnit }     from "../../domain/entities/AcademicUnit";
import { AcademicUnitType } from "../../domain/value-objects/AcademicUnitType";
import { AcademicUnitModel } from "../models/AcademicUnitModel";

// Chuyển đổi AcademicUnitModel (Oracle row) → AcademicUnit (domain entity).
//
// Scope: CHỈ dùng trong AcademicRepository.
// Repository query → row → gọi mapper → trả về domain object.
export class AcademicUnitMapper {
  // Oracle row → AcademicUnit entity
  //
  // Gọi AcademicUnit.reconstruct() thay vì new AcademicUnit() trực tiếp
  // vì reconstruct() enforce invariant: hierarchy phải hợp lệ
  // (FACULTY không có parentId, COURSE và SECTION phải có parentId).
  // Nếu DB data bị corrupt → reconstruct() throw ngay tại đây,
  // không để invalid entity leak ra ngoài application layer.
  static toDomain(row: AcademicUnitModel): AcademicUnit {
    return AcademicUnit.reconstruct({
      unitId:   row.UNIT_ID,
      unitName: row.UNIT_NAME,
      unitCode: row.UNIT_CODE,
      type:     AcademicUnitType.of(row.TYPE),
      parentId: row.PARENT_ID ?? null,
    });
  }

  // Batch convert — dùng khi query trả về nhiều rows
  // (ví dụ: getSubtree dùng Recursive CTE)
  static toDomainList(rows: AcademicUnitModel[]): AcademicUnit[] {
    return rows.map(AcademicUnitMapper.toDomain);
  }
}