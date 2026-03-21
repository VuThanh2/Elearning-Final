-- Roles
INSERT INTO roles (role_id, role_name) VALUES (1, 'Student');
INSERT INTO roles (role_id, role_name) VALUES (2, 'Teacher');
INSERT INTO roles (role_id, role_name) VALUES (3, 'Admin');

-- Permissions
INSERT INTO permissions (permission_id, permission_type) VALUES (1,  'ATTEMPT_QUIZ');
INSERT INTO permissions (permission_id, permission_type) VALUES (2,  'VIEW_OWN_RESULT');
INSERT INTO permissions (permission_id, permission_type) VALUES (3,  'VIEW_CLASS_RANKING');
INSERT INTO permissions (permission_id, permission_type) VALUES (4,  'VIEW_SECTION');
INSERT INTO permissions (permission_id, permission_type) VALUES (5,  'CREATE_QUIZ');
INSERT INTO permissions (permission_id, permission_type) VALUES (6,  'EDIT_QUIZ');
INSERT INTO permissions (permission_id, permission_type) VALUES (7,  'PUBLISH_QUIZ');
INSERT INTO permissions (permission_id, permission_type) VALUES (8,  'HIDE_QUIZ');
INSERT INTO permissions (permission_id, permission_type) VALUES (9, 'VIEW_ANALYTICS');
INSERT INTO permissions (permission_id, permission_type) VALUES (10, 'VIEW_AT_RISK_STUDENTS');
INSERT INTO permissions (permission_id, permission_type) VALUES (11, 'VIEW_HIERARCHICAL_REPORT');

-- RolePermissions (mapping)
-- Student
INSERT INTO role_permissions VALUES (1, 1);  -- ATTEMPT_QUIZ
INSERT INTO role_permissions VALUES (1, 2);  -- VIEW_OWN_RESULT
INSERT INTO role_permissions VALUES (1, 3);  -- VIEW_CLASS_RANKING
INSERT INTO role_permissions VALUES (1, 4);  -- VIEW_SECTION

-- Teacher
INSERT INTO role_permissions VALUES (2, 1);  -- ATTEMPT_QUIZ
INSERT INTO role_permissions VALUES (2, 2);  -- VIEW_OWN_RESULT
INSERT INTO role_permissions VALUES (2, 3);  -- VIEW_CLASS_RANKING
INSERT INTO role_permissions VALUES (2, 4);  -- VIEW_SECTION
INSERT INTO role_permissions VALUES (2, 5);  -- CREATE_QUIZ
INSERT INTO role_permissions VALUES (2, 6);  -- EDIT_QUIZ
INSERT INTO role_permissions VALUES (2, 7);  -- PUBLISH_QUIZ
INSERT INTO role_permissions VALUES (2, 8);  -- HIDE_QUIZ
INSERT INTO role_permissions VALUES (2, 9);  -- VIEW_ANALYTICS
INSERT INTO role_permissions VALUES (2, 10); -- VIEW_AT_RISK_STUDENTS
INSERT INTO role_permissions VALUES (2, 11); -- VIEW_HIERARCHICAL_REPORT

-- Admin
INSERT INTO role_permissions VALUES (3, 9);  -- VIEW_ANALYTICS
INSERT INTO role_permissions VALUES (3, 10); -- VIEW_AT_RISK_STUDENTS
INSERT INTO role_permissions VALUES (3, 11); -- VIEW_HIERARCHICAL_REPORT
INSERT INTO role_permissions VALUES (3, 3);  -- VIEW_CLASS_RANKING
INSERT INTO role_permissions VALUES (3, 4);  -- VIEW_SECTION