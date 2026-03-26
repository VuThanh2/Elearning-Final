// Đại diện cho 3 loại đơn vị học thuật trong hệ thống phân cấp:
//   FACULTY → COURSE → SECTION
//
// Tại sao dùng class thay vì enum thuần túy?
//   - Có thể gắn behavior (isRoot, isLeaf, canBeParentOf)
//   - Enforce valid hierarchy logic ngay tại Value Object
//   - Immutable — không có setter
//
// Rule được enforce tại đây:
//   - FACULTY  : root, không có parent
//   - COURSE   : con của FACULTY
//   - SECTION  : con của COURSE, đơn vị thấp nhất
export type AcademicUnitTypeValue = "FACULTY" | "COURSE" | "SECTION";

const VALID_TYPES = new Set<AcademicUnitTypeValue>(["FACULTY", "COURSE", "SECTION"]);

// Định nghĩa parent hợp lệ cho từng type
// FACULTY  → không có parent (null)
// COURSE   → parent phải là FACULTY
// SECTION  → parent phải là COURSE
const VALID_PARENT_MAP: Record<AcademicUnitTypeValue, AcademicUnitTypeValue | null> = {
  FACULTY: null,
  COURSE:  "FACULTY",
  SECTION: "COURSE",
};

export class AcademicUnitType {
  private constructor(private readonly _value: AcademicUnitTypeValue) {}

  static of(value: string): AcademicUnitType {
    const upper = value?.toUpperCase() as AcademicUnitTypeValue;
    if (!VALID_TYPES.has(upper)) {
      throw new Error(
        `AcademicUnitType: Giá trị không hợp lệ "${value}". ` +
        `Chỉ chấp nhận: FACULTY, COURSE, SECTION.`
      );
    }
    return new AcademicUnitType(upper);
  }

  static faculty():  AcademicUnitType { return new AcademicUnitType("FACULTY"); }
  static course():   AcademicUnitType { return new AcademicUnitType("COURSE"); }
  static section():  AcademicUnitType { return new AcademicUnitType("SECTION"); }

  // Queries 

  get value(): AcademicUnitTypeValue {
    return this._value;
  }

  // FACULTY là root của hierarchy — không có parent
  isRoot(): boolean {
    return this._value === "FACULTY";
  }

  // SECTION là leaf — không thể có con
  isLeaf(): boolean {
    return this._value === "SECTION";
  }

  isFaculty(): boolean { return this._value === "FACULTY"; }
  isCourse():  boolean { return this._value === "COURSE"; }
  isSection(): boolean { return this._value === "SECTION"; }

  // Kiểm tra type này có thể là parent của một type khác không
  // Rule: FACULTY → COURSE → SECTION, không cho phép đảo chiều hoặc skip cấp
  canBeParentOf(childType: AcademicUnitType): boolean {
    const expectedParent = VALID_PARENT_MAP[childType._value];
    return expectedParent === this._value;
  }

  // Kiểm tra type này có cần parent không (FACULTY thì không cần)
  requiresParent(): boolean {
    return !this.isRoot();
  }

  // Lấy type của parent hợp lệ — null nếu là FACULTY
  expectedParentType(): AcademicUnitTypeValue | null {
    return VALID_PARENT_MAP[this._value];
  }

  equals(other: AcademicUnitType): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}