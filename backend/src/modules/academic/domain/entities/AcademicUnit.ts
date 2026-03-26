import { AcademicUnitType } from "../value-objects/AcademicUnitType";

// Đại diện cho một đơn vị học thuật trong hệ thống phân cấp:
//   Faculty (root) → Course → Section (leaf)
//
// Tại sao dùng một entity duy nhất thay vì 3 class riêng biệt?
//   - Bounded Context document mô tả: "AcademicUnit" với field `type`
//   - Oracle dùng self-referencing table (ACADEMIC_UNITS với PARENT_ID)
//   - Hỗ trợ Recursive CTE: traverse hierarchy từ cùng 1 table
//   - Nếu tách thành 3 class → phải JOIN 3 bảng, mất lợi thế của Recursive CTE
//
// Academic Context là READ-ONLY source of truth:
//   - Không có Create/Update/Delete method trên entity
//   - Không có Domain Event
//   - Không có Aggregate (context này không write gì cả)
//   - Entity chỉ dùng để reconstruct từ DB và expose query methods
//
// Invariant được enforce tại reconstruct() — không cho phép tạo entity
// với hierarchy không hợp lệ (ví dụ: SECTION có parent là FACULTY).
interface AcademicUnitProps {
  unitId:   string;
  unitName: string;
  unitCode: string;
  type:     AcademicUnitType;
  parentId: string | null; // null chỉ khi type = FACULTY
}

export class AcademicUnit {
  private constructor(private readonly props: AcademicUnitProps) {}

  // chỉ dùng khi reconstruct từ DB 
  // Không có AcademicUnit.create() vì Academic Context không tạo mới unit trong runtime.
  // Data được seed trước bởi admin.
  static reconstruct(props: AcademicUnitProps): AcademicUnit {
    AcademicUnit.assertValidHierarchy(props.type, props.parentId);
    return new AcademicUnit(props);
  }

  // Invariant guard
  private static assertValidHierarchy(
    type:     AcademicUnitType,
    parentId: string | null,
  ): void {
    // Rule: Faculty Is the Root Unit — không có parent
    if (type.isFaculty() && parentId !== null) {
      throw new Error(
        "AcademicUnit: FACULTY không được có parentId. " +
        "Faculty là root của hierarchy."
      );
    }

    // Rule: Course và Section phải có parent
    if (type.requiresParent() && parentId === null) {
      throw new Error(
        `AcademicUnit: ${type.value} phải có parentId. ` +
        `Chỉ FACULTY mới được phép không có parent.`
      );
    }
  }

  // Getters 
  get unitId():   string               { return this.props.unitId; }
  get unitName(): string               { return this.props.unitName; }
  get unitCode(): string               { return this.props.unitCode; }
  get type():     AcademicUnitType     { return this.props.type; }
  get parentId(): string | null        { return this.props.parentId; }

  // Convenience type checks 
  isFaculty(): boolean { return this.props.type.isFaculty(); }
  isCourse():  boolean { return this.props.type.isCourse(); }
  isSection(): boolean { return this.props.type.isSection(); }

  // Query: có phải là root (Faculty) không
  isRoot(): boolean {
    return this.props.type.isRoot();
  }

  // Query: có phải là leaf (Section) không
  isLeaf(): boolean {
    return this.props.type.isLeaf();
  }

  // Query: đây có phải là direct parent của một unit khác không
  // Chỉ dùng khi đã load cả 2 unit vào memory (ví dụ: validate khi seed)
  isDirectParentOf(child: AcademicUnit): boolean {
    return child.parentId === this.unitId &&
           this.type.canBeParentOf(child.type);
  }

  // Equality
  equals(other: AcademicUnit): boolean {
    return this.unitId === other.unitId;
  }

  toString(): string {
    return `AcademicUnit(${this.type.value}:${this.unitCode}:"${this.unitName}")`;
  }
}