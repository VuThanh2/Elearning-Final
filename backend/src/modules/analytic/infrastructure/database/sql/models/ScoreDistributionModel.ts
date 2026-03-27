// Scope: CHỈ dùng trong infrastructure layer.
// Mapping tới domain: ScoreDistributionView + ScoreRangeBucket
//                     (domain/read-models/ScoreDistributionView.ts)
//
// Tại sao tách thành 2 bảng (header + bucket) thay vì 1?
//   ScoreDistributionView có cấu trúc 1-nhiều: 1 quiz×section → N buckets.
//   Nếu nhét tất cả vào 1 bảng với cột BUCKET_1_COUNT, BUCKET_2_COUNT...
//   thì số bucket bị cứng — không thể thay đổi số lượng bucket mà không
//   ALTER TABLE. Tách bảng bucket riêng linh hoạt hơn.
// Bảng Header
export interface ScoreDistributionModel {
  QUIZ_ID:               string;
  SECTION_ID:            string;
  QUIZ_TITLE:            string;
  SECTION_NAME:          string;
  MAX_SCORE:             number;
  TOTAL_RANKED_STUDENTS: number;
  LAST_UPDATED_AT:       Date;
}

// Bảng bucket 
// Bucket mặc định 4 rows per (QUIZ_ID, SECTION_ID):
//   BUCKET_ORDER=1: LABEL='Dưới trung bình', RANGE_START_PCT=0.00, RANGE_END_PCT=0.50
//   BUCKET_ORDER=2: LABEL='Trung bình',       RANGE_START_PCT=0.50, RANGE_END_PCT=0.70
//   BUCKET_ORDER=3: LABEL='Khá',              RANGE_START_PCT=0.70, RANGE_END_PCT=0.85
//   BUCKET_ORDER=4: LABEL='Giỏi',             RANGE_START_PCT=0.85, RANGE_END_PCT=1.00
//
// IS_UPPER_BOUND_INCLUSIVE: Oracle không có boolean — dùng NUMBER(1).
//   Mapper sẽ convert: 0 → false, 1 → true.
export interface ScoreDistributionBucketModel {
  QUIZ_ID:                  string;
  SECTION_ID:               string;
  BUCKET_ORDER:             number; // thứ tự bucket, bắt đầu từ 1
  LABEL:                    string;
  RANGE_START_PCT:          number; // 0.0000–1.0000
  RANGE_END_PCT:            number; // 0.0000–1.0000
  RANGE_START:              number; // điểm tuyệt đối
  RANGE_END:                number; // điểm tuyệt đối
  IS_UPPER_BOUND_INCLUSIVE: number; // 0 | 1 (Oracle không có boolean)
  STUDENT_COUNT:            number;
  PERCENTAGE:               number; // 0.0000–1.0000
}