-- Academic Context — Database Initialization
-- Chạy file này bằng SQL Developer / SQLPlus / DBeaver
-- Yêu cầu: Identity init.sql đã chạy trước (USERS table phải tồn tại)
--
-- Thứ tự tạo bảng theo đúng dependency (FK):
--   1. ACADEMIC_UNITS       — self-referencing, tạo trước / ALTER FK sau
--   2. TEACHING_ASSIGNMENTS — FK → USERS + ACADEMIC_UNITS
--   3. ENROLLMENTS          — FK → USERS + ACADEMIC_UNITS
--
-- Thứ tự DROP ngược lại để tránh FK violation.

-- DROP (thứ tự ngược chiều FK)
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE ENROLLMENTS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE TEACHING_ASSIGNMENTS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/
BEGIN
    EXECUTE IMMEDIATE 'DROP TABLE ACADEMIC_UNITS CASCADE CONSTRAINTS';
EXCEPTION WHEN OTHERS THEN NULL;
END;
/

-- 1. ACADEMIC_UNITS
--
-- Self-referencing table đại diện cho hierarchy 3 cấp:
--   FACULTY (root, PARENT_ID = NULL)
--     └ COURSE  (PARENT_ID → FACULTY.UNIT_ID)
--          └ SECTION (PARENT_ID → COURSE.UNIT_ID)
--
-- Tại sao dùng 1 table thay vì 3 table riêng?
--   → Hỗ trợ Recursive CTE (WITH ... CONNECT BY) để traverse
--     toàn bộ hierarchy trong 1 query — phục vụ HierarchicalQuizReportView
--     ở Analytics Context.
--
-- Self-referencing FK không thể khai báo trong CREATE TABLE vì
-- table chưa tồn tại lúc đó → dùng ALTER TABLE thêm FK sau.
CREATE TABLE ACADEMIC_UNITS (
    UNIT_ID   VARCHAR2(36)  NOT NULL,
    UNIT_NAME VARCHAR2(200) NOT NULL,
    UNIT_CODE VARCHAR2(50)  NOT NULL,
    TYPE      VARCHAR2(10)  NOT NULL,
    PARENT_ID VARCHAR2(36)  NULL,     -- NULL khi TYPE = 'FACULTY'

    CONSTRAINT PK_ACADEMIC_UNITS  PRIMARY KEY (UNIT_ID),
    CONSTRAINT UQ_UNIT_CODE       UNIQUE      (UNIT_CODE),
    CONSTRAINT CHK_UNIT_TYPE      CHECK       (TYPE IN ('FACULTY', 'COURSE', 'SECTION'))
);

-- Self-referencing FK thêm sau khi bảng đã tồn tại
ALTER TABLE ACADEMIC_UNITS
    ADD CONSTRAINT FK_UNIT_PARENT
        FOREIGN KEY (PARENT_ID)
        REFERENCES  ACADEMIC_UNITS (UNIT_ID);

-- Index trên PARENT_ID để tăng tốc Recursive CTE traverse
CREATE INDEX IDX_ACADEMIC_UNITS_PARENT ON ACADEMIC_UNITS (PARENT_ID);

-- Index trên TYPE để tăng tốc filter sectionExists() → WHERE TYPE = 'SECTION'
CREATE INDEX IDX_ACADEMIC_UNITS_TYPE ON ACADEMIC_UNITS (TYPE);

-- 2. TEACHING_ASSIGNMENTS
--
-- Mapping Teacher ↔ Section.
-- Business Rules được enforce tại đây:
--   - Rule: Teaching Assignment Must Reference a Section
--     → CHK_TEACH_SECTION_TYPE (sub-query check TYPE = 'SECTION')
--   - Rule: Teachers Cannot Be Assigned to the Same Section
--     → PK (TEACHER_ID, SECTION_ID) — composite primary key
--
-- FK → USERS thay vì TEACHER_PROFILES vì USERS là bảng root identity.
CREATE TABLE TEACHING_ASSIGNMENTS (
    TEACHER_ID    VARCHAR2(36)  NOT NULL,
    SECTION_ID    VARCHAR2(36)  NOT NULL,
    TERM          VARCHAR2(20)  NOT NULL,   -- 'HK1' | 'HK2' | 'Summer'
    ACADEMIC_YEAR VARCHAR2(20)  NOT NULL,   -- '2024-2025'

    CONSTRAINT PK_TEACHING_ASSIGN
        PRIMARY KEY (TEACHER_ID, SECTION_ID),

    CONSTRAINT FK_TEACH_TEACHER
        FOREIGN KEY (TEACHER_ID)
        REFERENCES  USERS (USER_ID),

    CONSTRAINT FK_TEACH_SECTION
        FOREIGN KEY (SECTION_ID)
        REFERENCES  ACADEMIC_UNITS (UNIT_ID),

    -- Rule: Teaching Assignment Must Reference a Section (TYPE = 'SECTION')
    -- Dùng sub-query CHECK để đảm bảo teacher không thể được assign
    -- vào FACULTY hay COURSE — chỉ được assign vào SECTION.
    CONSTRAINT CHK_TEACH_SECTION_TYPE CHECK (
        SECTION_ID IN (
            SELECT UNIT_ID FROM ACADEMIC_UNITS WHERE TYPE = 'SECTION'
        )
    )
);

-- Index trên TEACHER_ID để tăng tốc isTeacherAssignedToSection()
-- và findSectionsByTeacher()
CREATE INDEX IDX_TEACH_TEACHER ON TEACHING_ASSIGNMENTS (TEACHER_ID);

-- 3. ENROLLMENTS
--
-- Mapping Student ↔ Section.
-- Business Rules được enforce tại đây:
--   - Rule: Enrollment Must Reference a Section
--     → CHK_ENROLL_SECTION_TYPE (sub-query check TYPE = 'SECTION')
--   - Student không thể enroll trùng vào cùng section
--     → PK (STUDENT_ID, SECTION_ID) — composite primary key
CREATE TABLE ENROLLMENTS (
    STUDENT_ID    VARCHAR2(36)  NOT NULL,
    SECTION_ID    VARCHAR2(36)  NOT NULL,
    TERM          VARCHAR2(20)  NOT NULL,
    ACADEMIC_YEAR VARCHAR2(20)  NOT NULL,

    CONSTRAINT PK_ENROLLMENT
        PRIMARY KEY (STUDENT_ID, SECTION_ID),

    CONSTRAINT FK_ENROLL_STUDENT
        FOREIGN KEY (STUDENT_ID)
        REFERENCES  USERS (USER_ID),

    CONSTRAINT FK_ENROLL_SECTION
        FOREIGN KEY (SECTION_ID)
        REFERENCES  ACADEMIC_UNITS (UNIT_ID),

    -- Rule: Enrollment Must Reference a Section (TYPE = 'SECTION')
    CONSTRAINT CHK_ENROLL_SECTION_TYPE CHECK (
        SECTION_ID IN (
            SELECT UNIT_ID FROM ACADEMIC_UNITS WHERE TYPE = 'SECTION'
        )
    )
);

-- Index trên STUDENT_ID để tăng tốc isStudentEnrolledInSection()
-- và findSectionsByStudent()
CREATE INDEX IDX_ENROLL_STUDENT ON ENROLLMENTS (STUDENT_ID);