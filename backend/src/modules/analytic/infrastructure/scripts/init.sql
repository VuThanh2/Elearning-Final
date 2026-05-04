-- Chạy file này bằng SQL Developer / SQLPlus / DBeaver
-- Yêu cầu: Identity init.sql và Academic init.sql đã chạy trước
--   (Projector JOIN vào ACADEMIC_UNITS và USERS tại runtime
--    nên các bảng đó phải tồn tại)
--
--   Projector dùng MERGE INTO ... USING DUAL để upsert projection.
--   Oracle yêu cầu TABLE PHẢI TỒN TẠI TRƯỚC khi chạy MERGE INTO.
--   Nếu table chưa tồn tại → ORA-00942: table or view does not exist.
--   Lỗi không xảy ra lúc server start, mà xảy ra lúc student nộp bài
--   lần đầu tiên → runtime crash, khó debug hơn.
--
-- So sánh với Identity/Academic init:
--   Identity/Academic: tables phải có trước để INSERT write data
--   Analytics:         tables phải có trước để MERGE INTO projection
--   → Cùng lý do kỹ thuật, khác mục đích.
--
-- So sánh với MongoDB (analytics_student_quiz_answers):
--   MongoDB tự tạo collection khi upsert → không bắt buộc init.
--   Nhưng nếu không init trước, sẽ không có JSON Schema validator
--   và không có indexes → vẫn nên init để đảm bảo data quality.
--
-- Điểm khác biệt so với Identity/Academic:
--   Analytics tables bắt đầu RỖNG HOÀN TOÀN sau khi init.
--   Không có seed data vì chưa có event nào được xử lý.
--   Data sẽ xuất hiện tự động khi Projector nhận event đầu tiên.
--
-- THỨ TỰ DROP / CREATE
--
-- DROP ngược thứ tự để xử lý FK nội bộ:
--   ANALYTICS_SCORE_DISTRIBUTION_BUCKET có FK → ANALYTICS_SCORE_DISTRIBUTION
--   → phải DROP BUCKET trước, DISTRIBUTION sau
--
-- Các bảng còn lại không phụ thuộc nhau → DROP theo bất kỳ thứ tự nào.
-- DROP (thứ tự ngược chiều FK nội bộ)

BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_SCORE_DISTRIBUTION_BUCKET CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_SCORE_DISTRIBUTION CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_HIERARCHICAL_REPORT CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_STUDENT_CLASS_RANKING CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_AT_RISK_STUDENT CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_STUDENT_QUIZ_RESULT CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/
BEGIN EXECUTE IMMEDIATE 'DROP TABLE ANALYTICS_QUIZ_PERFORMANCE CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL; END;
/

-- 1. ANALYTICS_QUIZ_PERFORMANCE 
--
-- Precomputed aggregation cho Teacher xem thống kê tổng quát của 1 quiz
-- trong 1 section: completionRate, averageScore, highestScore, lowestScore.
--
-- PK: (QUIZ_ID, SECTION_ID) — 1 quiz có thể chạy ở nhiều section khác nhau,
-- mỗi section có projection riêng biệt.
--
-- completionRate = attemptedStudents / totalStudents
-- averageScore   = AVG(bestScore per student) — chỉ tính Submitted, không Expired
-- totalAttempts  = tổng lượt làm bài (kể cả Expired)
--
-- LAST_UPDATED_AT: thời điểm Projector cập nhật lần cuối.
-- Dùng để debug và monitor projection lag.
CREATE TABLE ANALYTICS_QUIZ_PERFORMANCE (
    QUIZ_ID            VARCHAR2(36)    NOT NULL,
    SECTION_ID         VARCHAR2(36)    NOT NULL,
    QUIZ_TITLE         VARCHAR2(500)   NOT NULL,
    SECTION_NAME       VARCHAR2(200)   NOT NULL,
    TOTAL_STUDENTS     NUMBER          DEFAULT 0 NOT NULL,
    MAX_SCORE          NUMBER(10,2)    DEFAULT 0 NOT NULL,
    TOTAL_ATTEMPTS     NUMBER          DEFAULT 0 NOT NULL,
    ATTEMPTED_STUDENTS NUMBER          DEFAULT 0 NOT NULL,
    COMPLETION_RATE    NUMBER(7,4)     DEFAULT 0 NOT NULL,   -- 0.0000 → 1.0000
    AVERAGE_SCORE      NUMBER(10,2)    DEFAULT 0 NOT NULL,
    HIGHEST_SCORE      NUMBER(10,2)    DEFAULT 0 NOT NULL,
    LOWEST_SCORE       NUMBER(10,2)    DEFAULT 0 NOT NULL,
    LAST_UPDATED_AT    TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_AQP PRIMARY KEY (QUIZ_ID, SECTION_ID),
    CONSTRAINT CHK_AQP_COMPLETION_RATE
        CHECK (COMPLETION_RATE >= 0 AND COMPLETION_RATE <= 1),
    CONSTRAINT CHK_AQP_COUNTS
        CHECK (ATTEMPTED_STUDENTS <= TOTAL_STUDENTS
               AND ATTEMPTED_STUDENTS >= 0
               AND TOTAL_ATTEMPTS >= 0)
);

-- Index hỗ trợ Teacher xem tất cả quiz của 1 section
CREATE INDEX IDX_AQP_SECTION ON ANALYTICS_QUIZ_PERFORMANCE (SECTION_ID);

-- 2. ANALYTICS_STUDENT_QUIZ_RESULT 
--
-- 1 row = 1 attempt đã finalized (Submitted hoặc Expired).
-- Student dùng để xem lại lịch sử các lần làm quiz của mình.
--
-- PK: ATTEMPT_ID — unique per attempt, không phải per student/quiz.
-- Compound indexes để support các query pattern phổ biến:
--   - Student xem tất cả kết quả: (STUDENT_ID, SECTION_ID)
--   - Projector recalculate bestScore per student: (STUDENT_ID, QUIZ_ID)
--
-- STATUS: 'SUBMITTED' | 'EXPIRED'
--   completionRate chỉ tính SUBMITTED, totalAttempts tính cả 2.
--
-- DURATION_SECONDS: submittedAt - startedAt, tính tại Projector.
-- Lưu sẵn để tránh tính lại mỗi lần query.
--
-- PERCENTAGE: score / maxScore, lưu sẵn (4 decimal places = 0.0000 → 1.0000).
CREATE TABLE ANALYTICS_STUDENT_QUIZ_RESULT (
    ATTEMPT_ID       VARCHAR2(36)    NOT NULL,
    QUIZ_ID          VARCHAR2(36)    NOT NULL,
    STUDENT_ID       VARCHAR2(36)    NOT NULL,
    SECTION_ID       VARCHAR2(36)    NOT NULL,
    QUIZ_TITLE       VARCHAR2(500)   NOT NULL,
    SCORE            NUMBER(10,2)    DEFAULT 0 NOT NULL,
    MAX_SCORE        NUMBER(10,2)    DEFAULT 0 NOT NULL,
    PERCENTAGE       NUMBER(7,4)     DEFAULT 0 NOT NULL,
    STARTED_AT       TIMESTAMP       NOT NULL,
    SUBMITTED_AT     TIMESTAMP       NOT NULL,
    DURATION_SECONDS NUMBER          DEFAULT 0 NOT NULL,
    ATTEMPT_NUMBER   NUMBER          DEFAULT 1 NOT NULL,
    STATUS           VARCHAR2(10)    NOT NULL,
    CONSTRAINT PK_ASQR PRIMARY KEY (ATTEMPT_ID),
    CONSTRAINT CHK_ASQR_STATUS
        CHECK (STATUS IN ('SUBMITTED', 'EXPIRED')),
    CONSTRAINT CHK_ASQR_PERCENTAGE
        CHECK (PERCENTAGE >= 0 AND PERCENTAGE <= 1),
    CONSTRAINT CHK_ASQR_SCORE
        CHECK (SCORE >= 0 AND MAX_SCORE >= 0 AND SCORE <= MAX_SCORE),
    CONSTRAINT CHK_ASQR_ATTEMPT_NUM
        CHECK (ATTEMPT_NUMBER >= 1),
    CONSTRAINT CHK_ASQR_DURATION
        CHECK (DURATION_SECONDS >= 0)
);

-- Student xem tất cả kết quả trong 1 section
CREATE INDEX IDX_ASQR_STUDENT_SECTION ON ANALYTICS_STUDENT_QUIZ_RESULT (STUDENT_ID, SECTION_ID);

-- Projector tính bestScore per student per quiz (cho ClassRanking, AtRisk)
CREATE INDEX IDX_ASQR_STUDENT_QUIZ ON ANALYTICS_STUDENT_QUIZ_RESULT (STUDENT_ID, QUIZ_ID);

-- Filter theo quiz + section (cho QuizPerformance aggregation)
CREATE INDEX IDX_ASQR_QUIZ_SECTION ON ANALYTICS_STUDENT_QUIZ_RESULT (QUIZ_ID, SECTION_ID);

-- 3. ANALYTICS_AT_RISK_STUDENT
--
-- Teacher xem danh sách student có nguy cơ bị học yếu trong 1 section.
-- PK: (SECTION_ID, STUDENT_ID) — scope tại section, không phải toàn hệ thống.
--
-- 2 loại risk level (phân tích theo 2 tiêu chí độc lập):
--   PARTICIPATION_RISK_LEVEL: dựa trên tỷ lệ hoàn thành quiz
--     HIGH   = quizParticipationRate < 0.50
--     MEDIUM = quizParticipationRate < 0.80
--     LOW    = quizParticipationRate >= 0.80
--
--   AVG_SCORE_RISK_LEVEL: dựa trên percentile điểm trung bình trong section
--     HIGH   = bottom 10%  (PERCENT_RANK < 0.10)
--     MEDIUM = bottom 25%  (PERCENT_RANK < 0.25)
--     LOW    = above 25%
--
-- Dùng NUMBER(1) CHECK IN (0,1) thay vì BOOLEAN
-- vì Oracle không có kiểu dữ liệu BOOLEAN trong SQL (chỉ có trong PL/SQL).
CREATE TABLE ANALYTICS_AT_RISK_STUDENT (
    SECTION_ID              VARCHAR2(36)    NOT NULL,
    STUDENT_ID              VARCHAR2(36)    NOT NULL,
    STUDENT_FULLNAME        VARCHAR2(200)   NOT NULL,
    SECTION_NAME            VARCHAR2(200)   NOT NULL,
    TOTAL_QUIZZES           NUMBER          DEFAULT 0 NOT NULL,
    ATTEMPTED_QUIZZES       NUMBER          DEFAULT 0 NOT NULL,
    AVERAGE_SCORE           NUMBER(10,2)    DEFAULT 0 NOT NULL,
    LOWEST_SCORE            NUMBER(10,2)    DEFAULT 0 NOT NULL,
    QUIZ_PARTICIPATION_RATE NUMBER(7,4)     DEFAULT 0 NOT NULL,
    PARTICIPATION_RISK_LEVEL VARCHAR2(10)   NOT NULL,
    AVG_SCORE_RISK_LEVEL    VARCHAR2(10)    NOT NULL,
    LAST_UPDATED_AT         TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_AARS PRIMARY KEY (SECTION_ID, STUDENT_ID),
    CONSTRAINT CHK_AARS_PARTICIPATION_RISK
        CHECK (PARTICIPATION_RISK_LEVEL IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT CHK_AARS_AVG_SCORE_RISK
        CHECK (AVG_SCORE_RISK_LEVEL IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT CHK_AARS_PARTICIPATION_RATE
        CHECK (QUIZ_PARTICIPATION_RATE >= 0 AND QUIZ_PARTICIPATION_RATE <= 1),
    CONSTRAINT CHK_AARS_QUIZZES
        CHECK (ATTEMPTED_QUIZZES <= TOTAL_QUIZZES AND ATTEMPTED_QUIZZES >= 0)
);

-- Teacher xem at-risk students trong section của mình
CREATE INDEX IDX_AARS_SECTION ON ANALYTICS_AT_RISK_STUDENT (SECTION_ID);

-- Filter by risk level để teacher ưu tiên xử lý HIGH risk trước
CREATE INDEX IDX_AARS_RISK ON ANALYTICS_AT_RISK_STUDENT (SECTION_ID, PARTICIPATION_RISK_LEVEL);

-- 4. ANALYTICS_STUDENT_CLASS_RANKING 
--
-- Student xem rank của mình trong 1 section (tính theo average best score
-- trên tất cả quizzes trong section đó).
--
-- PK: (SECTION_ID, STUDENT_ID) — rank trong section, không phải toàn hệ thống.
--
-- RANK_IN_SECTION dùng DENSE_RANK() — cùng điểm = cùng rank,
-- rank tiếp theo không bị skip (khác với RANK()).
-- Ví dụ: 1, 2, 2, 3 (DENSE_RANK) vs 1, 2, 2, 4 (RANK).
--
-- PERCENTILE: PERCENT_RANK() — 0.0 = thấp nhất, 1.0 = cao nhất trong section.
-- Dùng để xác định at-risk students (bottom 10% = PERCENTILE < 0.1).
--
-- Toàn bộ section được recalculate mỗi khi có 1 attempt mới —
-- vì 1 student nộp bài có thể thay đổi rank của tất cả student khác.
CREATE TABLE ANALYTICS_STUDENT_CLASS_RANKING (
    SECTION_ID              VARCHAR2(36)    NOT NULL,
    STUDENT_ID              VARCHAR2(36)    NOT NULL,
    STUDENT_FULLNAME        VARCHAR2(200)   NOT NULL,
    SECTION_NAME            VARCHAR2(200)   NOT NULL,
    AVERAGE_SCORE           NUMBER(10,2)    DEFAULT 0 NOT NULL,
    TOTAL_ATTEMPTS          NUMBER          DEFAULT 0 NOT NULL,
    RANK_IN_SECTION         NUMBER          NOT NULL,
    TOTAL_RANKED_STUDENTS   NUMBER          DEFAULT 0 NOT NULL,
    PERCENTILE              NUMBER(7,4)     DEFAULT 0 NOT NULL,   -- 0.0000 → 1.0000
    SECTION_AVERAGE_SCORE   NUMBER(10,2)    DEFAULT 0 NOT NULL,
    SECTION_HIGHEST_SCORE   NUMBER(10,2)    DEFAULT 0 NOT NULL,
    SECTION_LOWEST_SCORE    NUMBER(10,2)    DEFAULT 0 NOT NULL,
    LAST_UPDATED_AT         TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_ASCR PRIMARY KEY (SECTION_ID, STUDENT_ID),
    CONSTRAINT CHK_ASCR_RANK
        CHECK (RANK_IN_SECTION >= 1),
    CONSTRAINT CHK_ASCR_PERCENTILE
        CHECK (PERCENTILE >= 0 AND PERCENTILE <= 1)
);

-- Leaderboard trong section: xem top N students
CREATE INDEX IDX_ASCR_SECTION_RANK ON ANALYTICS_STUDENT_CLASS_RANKING (SECTION_ID, RANK_IN_SECTION);

-- 5. ANALYTICS_SCORE_DISTRIBUTION 
--
-- Header table của score distribution — 1 row per (quiz, section).
-- Chi tiết từng bucket lưu trong ANALYTICS_SCORE_DISTRIBUTION_BUCKET.
--
-- Tách header + bucket vì số bucket có thể thay đổi (flexible buckets):
-- Teacher/Admin có thể muốn 4 bucket (0-50, 50-70, 70-85, 85-100)
-- hoặc 10 bucket (decile) tuỳ context.
-- Nếu nhét vào 1 row sẽ cần dynamic columns — không khả thi với Oracle.
--
-- TOTAL_RANKED_STUDENTS: tổng student đã làm quiz (dùng để tính percentage của bucket).
CREATE TABLE ANALYTICS_SCORE_DISTRIBUTION (
    QUIZ_ID                 VARCHAR2(36)    NOT NULL,
    SECTION_ID              VARCHAR2(36)    NOT NULL,
    QUIZ_TITLE              VARCHAR2(500)   NOT NULL,
    SECTION_NAME            VARCHAR2(200)   NOT NULL,
    MAX_SCORE               NUMBER(10,2)    DEFAULT 0 NOT NULL,
    TOTAL_RANKED_STUDENTS   NUMBER          DEFAULT 0 NOT NULL,
    LAST_UPDATED_AT         TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_ASD PRIMARY KEY (QUIZ_ID, SECTION_ID),
    CONSTRAINT CHK_ASD_MAX_SCORE
        CHECK (MAX_SCORE >= 0),
    CONSTRAINT CHK_ASD_RANKED
        CHECK (TOTAL_RANKED_STUDENTS >= 0)
);

-- 6. ANALYTICS_SCORE_DISTRIBUTION_BUCKET
--
-- 1 row = 1 score bucket trong 1 quiz/section combination.
-- FK → ANALYTICS_SCORE_DISTRIBUTION: bucket không thể tồn tại khi header bị xóa.
--
-- PK: (QUIZ_ID, SECTION_ID, BUCKET_ORDER)
--   BUCKET_ORDER: thứ tự bucket từ thấp đến cao (1, 2, 3, 4, ...)
--
-- RANGE_START_PCT / RANGE_END_PCT: tỷ lệ % của maxScore (0.00 → 1.00)
-- RANGE_START / RANGE_END: giá trị điểm thực tế (tính từ PCT * maxScore)
-- Lưu cả 2 để frontend hiển thị dưới dạng % hoặc điểm tuyệt đối.
--
-- IS_UPPER_BOUND_INCLUSIVE: 0 = exclusive (<), 1 = inclusive (<=)
-- Dùng NUMBER(1) + CHECK IN (0,1) vì Oracle SQL không có BOOLEAN.
-- Bucket cuối thường inclusive để bắt đúng maxScore = 10.0 vào bucket cao nhất.
--
-- PERCENTAGE: studentCount / totalRankedStudents (Projector tính sẵn).
CREATE TABLE ANALYTICS_SCORE_DISTRIBUTION_BUCKET (
    QUIZ_ID                  VARCHAR2(36)   NOT NULL,
    SECTION_ID               VARCHAR2(36)   NOT NULL,
    BUCKET_ORDER             NUMBER         NOT NULL,
    LABEL                    VARCHAR2(100)  NOT NULL,   -- 'Dưới trung bình', 'Trung bình', 'Khá', 'Giỏi'
    RANGE_START_PCT          NUMBER(5,4)    NOT NULL,   -- 0.0000
    RANGE_END_PCT            NUMBER(5,4)    NOT NULL,   -- 1.0000
    RANGE_START              NUMBER(10,2)   NOT NULL,   -- điểm thực tế
    RANGE_END                NUMBER(10,2)   NOT NULL,
    IS_UPPER_BOUND_INCLUSIVE NUMBER(1)      DEFAULT 0 NOT NULL,
    STUDENT_COUNT            NUMBER         DEFAULT 0 NOT NULL,
    PERCENTAGE               NUMBER(7,4)    DEFAULT 0 NOT NULL,
    LAST_UPDATED_AT          TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_ASDB PRIMARY KEY (QUIZ_ID, SECTION_ID, BUCKET_ORDER),
    -- FK nội bộ trong Analytics Context (không sang write-side)
    CONSTRAINT FK_ASDB_HEADER
        FOREIGN KEY (QUIZ_ID, SECTION_ID)
        REFERENCES ANALYTICS_SCORE_DISTRIBUTION (QUIZ_ID, SECTION_ID),
    CONSTRAINT CHK_ASDB_INCLUSIVE
        CHECK (IS_UPPER_BOUND_INCLUSIVE IN (0, 1)),
    CONSTRAINT CHK_ASDB_RANGES
        CHECK (RANGE_START >= 0 AND RANGE_END >= RANGE_START
               AND RANGE_START_PCT >= 0 AND RANGE_END_PCT <= 1
               AND RANGE_START_PCT <= RANGE_END_PCT),
    CONSTRAINT CHK_ASDB_COUNTS
        CHECK (STUDENT_COUNT >= 0 AND PERCENTAGE >= 0 AND PERCENTAGE <= 1),
    CONSTRAINT CHK_ASDB_ORDER
        CHECK (BUCKET_ORDER >= 1)
);

-- Query tất cả buckets của 1 quiz/section (ordered cho histogram)
-- 7. ANALYTICS_HIERARCHICAL_REPORT
--
-- Admin xem báo cáo tổng hợp theo hierarchy: Faculty → Course → Section → Quiz.
-- 1 row = 1 quiz trong 1 section, kèm đầy đủ hierarchy labels đã denormalize.
--
-- Tại sao denormalize facultyId, courseId vào đây thay vì JOIN runtime?
--   → Report này thường dùng để drill-down theo hierarchy.
--   → Admin filter theo facultyId hoặc courseId thường xuyên.
--   → Denormalize giúp tránh JOIN qua ACADEMIC_UNITS mỗi lần query.
--   → Projector đã có hierarchy data từ SQL JOIN khi upsert.
--
-- PK: (QUIZ_ID, SECTION_ID) — nhất quán với QuizPerformance.
-- Compound indexes hỗ trợ drill-down từ Faculty xuống Section.
CREATE TABLE ANALYTICS_HIERARCHICAL_REPORT (
    FACULTY_ID          VARCHAR2(36)    NOT NULL,
    FACULTY_NAME        VARCHAR2(200)   NOT NULL,
    FACULTY_CODE        VARCHAR2(50)    NOT NULL,
    COURSE_ID           VARCHAR2(36)    NOT NULL,
    COURSE_NAME         VARCHAR2(200)   NOT NULL,
    COURSE_CODE         VARCHAR2(50)    NOT NULL,
    SECTION_ID          VARCHAR2(36)    NOT NULL,
    SECTION_NAME        VARCHAR2(200)   NOT NULL,
    SECTION_CODE        VARCHAR2(50)    NOT NULL,
    QUIZ_ID             VARCHAR2(36)    NOT NULL,
    QUIZ_TITLE          VARCHAR2(500)   NOT NULL,
    TOTAL_ATTEMPTS      NUMBER          DEFAULT 0 NOT NULL,
    ATTEMPTED_STUDENTS  NUMBER          DEFAULT 0 NOT NULL,
    TOTAL_STUDENTS      NUMBER          DEFAULT 0 NOT NULL,
    COMPLETION_RATE     NUMBER(7,4)     DEFAULT 0 NOT NULL,
    AVERAGE_SCORE       NUMBER(10,2)    DEFAULT 0 NOT NULL,
    LAST_UPDATED_AT     TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_AHR PRIMARY KEY (QUIZ_ID, SECTION_ID),
    CONSTRAINT CHK_AHR_COMPLETION
        CHECK (COMPLETION_RATE >= 0 AND COMPLETION_RATE <= 1),
    CONSTRAINT CHK_AHR_COUNTS
        CHECK (ATTEMPTED_STUDENTS >= 0
               AND TOTAL_STUDENTS >= 0
               AND TOTAL_ATTEMPTS >= 0)
);

-- Drill-down by Faculty: Admin xem tất cả quizzes trong 1 faculty
CREATE INDEX IDX_AHR_FACULTY ON ANALYTICS_HIERARCHICAL_REPORT (FACULTY_ID);

-- Drill-down by Course
CREATE INDEX IDX_AHR_COURSE ON ANALYTICS_HIERARCHICAL_REPORT (COURSE_ID);

-- Drill-down by Section
CREATE INDEX IDX_AHR_SECTION ON ANALYTICS_HIERARCHICAL_REPORT (SECTION_ID);

-- Compound: filter by faculty rồi sort by section (common admin query pattern)
CREATE INDEX IDX_AHR_FACULTY_SECTION ON ANALYTICS_HIERARCHICAL_REPORT (FACULTY_ID, SECTION_ID);
