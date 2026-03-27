import { ScoreDistributionView, ScoreRangeBucket } from "../../../../domain/read-models/ScoreDistributionView";
import { ScoreDistributionModel, ScoreDistributionBucketModel } from "../models/ScoreDistributionModel";

// Chỉ có toDomain() — không có toPersistence().
//
// Đây là mapper phức tạp nhất trong bộ SQL mappers vì ScoreDistributionView
// được build từ 2 bảng Oracle riêng biệt:
//   - ANALYTICS_SCORE_DISTRIBUTION        → header (1 row)
//   - ANALYTICS_SCORE_DISTRIBUTION_BUCKET → buckets (N rows, sorted by BUCKET_ORDER)
//
// Repository query 2 bảng, truyền cả hai vào mapper.
//
// IS_UPPER_BOUND_INCLUSIVE: Oracle NUMBER(1) → TypeScript boolean
//   0 → false, 1 → true
//   Bất kỳ giá trị nào khác 0/1 → throw (data corrupt)
export class ScoreDistributionMapper {

  // Nhận header row + bucket rows riêng biệt.
  // Repository đảm bảo buckets đã được sort theo BUCKET_ORDER ASC trước khi truyền vào.
  static toDomain(
    header:  ScoreDistributionModel,
    buckets: ScoreDistributionBucketModel[],
  ): ScoreDistributionView {
    return {
      quizId:               header.QUIZ_ID,
      sectionId:            header.SECTION_ID,
      quizTitle:            header.QUIZ_TITLE,
      sectionName:          header.SECTION_NAME,
      maxScore:             header.MAX_SCORE,
      totalRankedStudents:  header.TOTAL_RANKED_STUDENTS,
      lastUpdatedAt:        header.LAST_UPDATED_AT,
      scoreRanges:          buckets.map(ScoreDistributionMapper.bucketToDomain),
    };
  }

  private static bucketToDomain(row: ScoreDistributionBucketModel): ScoreRangeBucket {
    if (row.IS_UPPER_BOUND_INCLUSIVE !== 0 && row.IS_UPPER_BOUND_INCLUSIVE !== 1) {
      throw new Error(
        `ScoreDistributionMapper: IS_UPPER_BOUND_INCLUSIVE không hợp lệ "${row.IS_UPPER_BOUND_INCLUSIVE}" ` +
        `cho (quizId="${row.QUIZ_ID}", sectionId="${row.SECTION_ID}", ` +
        `bucketOrder=${row.BUCKET_ORDER}). Phải là 0 hoặc 1.`
      );
    }

    return {
      label:                  row.LABEL,
      rangeStartPct:          row.RANGE_START_PCT,
      rangeEndPct:            row.RANGE_END_PCT,
      rangeStart:             row.RANGE_START,
      rangeEnd:               row.RANGE_END,
      isUpperBoundInclusive:  row.IS_UPPER_BOUND_INCLUSIVE === 1,
      studentCount:           row.STUDENT_COUNT,
      percentage:             row.PERCENTAGE,
    };
  }
}