// Map 1-1 với schema của bảng ACADEMIC_UNITS trong Oracle.
//
// Self-referencing FK (PARENT_ID → UNIT_ID) cho phép dùng Recursive CTE
// để traverse toàn bộ hierarchy Faculty → Course → Section trong 1 query.
//
// Scope: CHỈ dùng trong infrastructure layer (AcademicRepository, AcademicMapper).
// Domain layer không biết type này tồn tại.
export interface AcademicUnitModel {
  UNIT_ID:   string;
  UNIT_NAME: string;
  UNIT_CODE: string;
  TYPE:      "FACULTY" | "COURSE" | "SECTION";
  PARENT_ID: string | null;
}