// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: StudentClassRankingView (domain/read-models/StudentClassRankingView.ts)
//
// Upsert key: (SECTION_ID, STUDENT_ID).
//
// Đặc điểm quan trọng — toàn bộ section được recalculate cùng lúc:
//   RANK_IN_SECTION dùng DENSE_RANK() OVER (PARTITION BY SECTION_ID ORDER BY AVERAGE_SCORE DESC).
//   PERCENTILE     dùng PERCENT_RANK() OVER (PARTITION BY SECTION_ID ORDER BY AVERAGE_SCORE).
//   SECTION_AVERAGE/HIGHEST/LOWEST dùng window aggregate trên cùng partition.
//
//   → Projector không thể upsert 1 row riêng lẻ và giữ rank đúng.
//     Mỗi lần có attempt mới trong section, projector phải:
//     1. Recalculate toàn bộ ranking cho section đó trong 1 transaction.
//     2. Bulk upsert tất cả rows của section.
//
// TOTAL_RANKED_STUDENTS: số student có ít nhất 1 submitted attempt trong section.
//   Student chưa attempt quiz nào sẽ không có row trong bảng này.
export interface StudentClassRankingModel {
  SECTION_ID:            string;
  STUDENT_ID:            string;
  STUDENT_FULLNAME:      string;
  SECTION_NAME:          string;
  AVERAGE_SCORE:         number;
  TOTAL_ATTEMPTS:        number;
  RANK_IN_SECTION:       number; // DENSE_RANK(), bắt đầu từ 1
  TOTAL_RANKED_STUDENTS: number;
  PERCENTILE:            number; // PERCENT_RANK(), 0.0000–1.0000
  SECTION_AVERAGE_SCORE: number;
  SECTION_HIGHEST_SCORE: number;
  SECTION_LOWEST_SCORE:  number;
  LAST_UPDATED_AT:       Date;
}