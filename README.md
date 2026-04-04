# LMS Backend — Quick Start Guide

## Yêu cầu
- Node.js >= 18, Docker Desktop đang chạy

---

## 1. Cài đặt lần đầu

```bash
# Clone xong, vào thư mục backend
cd backend
npm install

# Tạo file .env
cp .env.example .env
```

Chỉnh `.env` với các giá trị thực:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173

JWT_SECRET=any_random_string_dai_hon_32_ky_tu
JWT_EXPIRES_IN=1d

MONGO_URI=mongodb://localhost:27017/lms_db

ORACLE_USER=lms_user
ORACLE_PASSWORD=lms_pass_123
ORACLE_SYS_PASSWORD=sys_pass_123
ORACLE_CONNECTION_STRING=127.0.0.1:1521/XEPDB1

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=redis_pass_123
```

> `ORACLE_USER` / `ORACLE_PASSWORD` phải khớp với `APP_USER` / `APP_USER_PASSWORD` trong docker-compose (tự động được đọc từ `.env`).

---

## 2. Khởi động Docker

```bash
npm run docker:up
```

Chờ Oracle ready (~60-90 giây). Kiểm tra:
```bash
docker logs -f oracle_lms
# Chờ dòng: DATABASE IS READY TO USE!

docker ps   # cả 3 container: mongo_lms, redis_lms, oracle_lms đều Up (healthy)
```

---

## 3. Seed Oracle Database

> ⚠️ **Windows/Git Bash:** File SQL bị CRLF khi copy sang Linux. Phải convert trước.

```bash
# Bước 1 — Copy scripts vào container
docker cp backend/src/modules/identity/infrastructure/scripts/init.sql    oracle_lms:/tmp/identity_init.sql
docker cp backend/src/modules/identity/infrastructure/scripts/seed.sql    oracle_lms:/tmp/identity_seed.sql
docker cp backend/src/modules/academic/infrastructure/scripts/init.sql    oracle_lms:/tmp/academic_init.sql
docker cp backend/src/modules/academic/infrastructure/scripts/seed.sql    oracle_lms:/tmp/academic_seed.sql
docker cp backend/src/modules/analytic/infrastructure/scripts/init.sql    oracle_lms:/tmp/analytic_init.sql

#Xài cái này nếu cái trên bị lỗi:
docker cp backend/src/modules/identity/infrastructure/scripts/init.sql  oracle_lms:/var/tmp/1_identity_init.sql
docker cp backend/src/modules/identity/infrastructure/scripts/seed.sql  oracle_lms:/var/tmp/2_identity_seed.sql
docker cp backend/src/modules/academic/infrastructure/scripts/init.sql  oracle_lms:/var/tmp/3_academic_init.sql
docker cp backend/src/modules/academic/infrastructure/scripts/seed.sql  oracle_lms:/var/tmp/4_academic_seed.sql
docker cp backend/src/modules/analytic/infrastructure/scripts/init.sql  oracle_lms:/var/tmp/5_analytic_init.sql

# Bước 2 — Convert CRLF → LF (bắt buộc trên Windows) (chỉ chạy nếu gặp lỗi ở bước 1)
docker exec oracle_lms bash -c "
  for f in /var/tmp/1_identity_init.sql /var/tmp/2_identity_seed.sql \
            /var/tmp/3_academic_init.sql /var/tmp/4_academic_seed.sql \
            /var/tmp/5_analytic_init.sql; do
    tr -d '\r' < \$f > \${f}.clean && mv \${f}.clean \$f
  done
"

# Bước 3 — Chạy theo thứ tự (FK dependency)
Tạo 1 BASH TERMINAL
docker exec -it oracle_lms bash
```

Trong container, chạy lần lượt từng cái:
```bash
sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/identity_init.sql

sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/identity_seed.sql

sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/academic_init.sql

sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/academic_seed.sql

sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/analytic_init.sql
```

Hoặc các Lệnh này (nếu ở trên bị lỗi):
CONN="lms_user/lms_pass_123@//localhost:1521/XEPDB1"
sqlplus $CONN @/var/tmp/1_identity_init.sql
sqlplus $CONN @/var/tmp/2_identity_seed.sql
sqlplus $CONN @/var/tmp/3_academic_init.sql
sqlplus $CONN @/var/tmp/4_academic_seed.sql
sqlplus $CONN @/var/tmp/5_analytic_init.sql
exit

Output đúng: chỉ có `Table created.` và `1 row created.` — **không có** `SP2-0734` hay `ORA-XXXXX`.

> MongoDB collections được tạo tự động khi server khởi động.

---

## 4. Chạy Server

```Terminal
cd backend
npm run dev
```

Output đúng:
```
MongoDB connected
Oracle connected
Redis connected
Server running on port 3000
```

Kiểm tra nhanh:
```bash
curl http://localhost:3000/
# {"status":"ok","timestamp":"..."}
```

---

## 5. Accounts & Data sẵn có

| Role    | Email                        | Password    |
|---------|------------------------------|-------------|
| Admin   | admin@school.edu.vn          | Admin@123   |
| Teacher | nguyen.van.an@school.edu.vn  | Teacher@123 | → SE-A
| Teacher | tran.thi.bich@school.edu.vn  | Teacher@123 | → SE-B
| Teacher | le.minh.duc@school.edu.vn    | Teacher@123 | → CSDB-A
| Student | pham.quoc.bao@school.edu.vn  | Student@123 | → SE-A, SE-B
| Student | hoang.thi.mai@school.edu.vn  | Student@123 | → SE-A, CSDB-A
| Student | vu.dinh.khoa@school.edu.vn   | Student@123 | → SE-B, CSDB-A
| Student | do.thanh.tuyen@school.edu.vn | Student@123 | → CSDB-A

---

## 6. Các luồng chính

### Luồng Teacher — Tạo & Publish Quiz
```
POST /auth/login
  → GET /academic/sections/teaching        # lấy sectionId
  GET /sections/{sectionId}/quizzes        # xem quiz list
  → POST /quizzes                          # tạo quiz (status: Draft)
  → POST /quizzes/{quizId}/questions       # thêm câu hỏi + options
  → POST /quizzes/{quizId}/publish         # publish
```

### Luồng Student — Làm bài
```
POST /auth/login
  → GET /academic/sections/enrolled        # xem section đang học
  → GET /sections/{sectionId}/quizzes/published  → xem quiz có thể làm bài
  → POST /quizzes/{quizId}/attempts        # bắt đầu làm bài
  → POST /attempts/{attemptId}/submit      # nộp bài → nhận score
```

### Luồng Analytics (sau khi có attempt)
```
# Teacher
GET /analytics/sections/{sectionId}/performance
GET /analytics/sections/{sectionId}/at-risk

# Student
GET /analytics/sections/{sectionId}/my-results
GET /analytics/sections/{sectionId}/my-ranking
GET /analytics/attempts/{attemptId}/answer-review

# Admin
GET /analytics/hierarchical-report
```

---

## 7. Kiểm tra khi lỗi

```bash
# Xem log Oracle
docker logs oracle_lms --tail 30

# Xem log MongoDB
docker logs mongo_lms --tail 20

# Test Redis
docker exec redis_lms redis-cli -a redis_pass_123 ping
# PONG

# Kiểm tra tables Oracle đã có chưa
docker exec -it oracle_lms sqlplus lms_user/lms_pass_123@//localhost:1521/XEPDB1 <<'EOF'
SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME;
SELECT COUNT(*) FROM USERS;
EXIT;
EOF

# Kiểm tra MongoDB collections
docker exec mongo_lms mongosh --eval "use lms_db; show collections"
```

---

## 8. Tắt / Reset

```bash
# Tắt server: Ctrl+C  (graceful shutdown tự động)

# Tắt Docker (giữ data)
npm run docker:down

# Reset sạch toàn bộ data (cần seed lại từ đầu)
npm run docker:reset
```