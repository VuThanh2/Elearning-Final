#!/bin/bash

echo ""
echo "=========================================="
echo "🚀 E-Learning LMS Development Environment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Step 0: Aggressive cleanup
echo -e "${BLUE}🧹 Step 0: Aggressive cleanup...${NC}"
echo -e "${YELLOW}  Stopping all containers...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true
timeout 2 2>/dev/null || sleep 2

echo -e "${YELLOW}  Removing old containers...${NC}"
docker rm mongo_lms redis_lms oracle_lms 2>/dev/null || true
timeout 1 2>/dev/null || sleep 1

echo -e "${YELLOW}  Resetting Docker compose...${NC}"
cd "$PROJECT_ROOT/backend" || exit 1
npm run docker:reset 2>/dev/null || true
timeout 5 2>/dev/null || sleep 5

cd "$PROJECT_ROOT" || exit 1

# Step 1: Start Docker containers
echo -e "${BLUE}📦 Step 1: Starting Docker containers...${NC}"
cd "$PROJECT_ROOT/backend" || exit 1
npm run docker:up || {
  echo -e "${RED}Error: docker:up failed${NC}"
  cd "$PROJECT_ROOT" || exit 1
  exit 1
}

cd "$PROJECT_ROOT" || exit 1

echo -e "${YELLOW}Waiting for Oracle to be ready (~60 seconds)...${NC}"
timeout 60 2>/dev/null || sleep 60

# Check if Oracle is ready
docker logs oracle_lms 2>/dev/null | grep -q "DATABASE IS READY TO USE"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Oracle is ready${NC}"
else
  echo -e "${YELLOW}⚠️  Oracle may still be starting. Containers should be healthy.${NC}"
fi

echo ""
echo -e "${BLUE}✅ Docker Status:${NC}"
docker ps | grep -E "mongo_lms|redis_lms|oracle_lms"

echo ""
echo -e "${BLUE}🗄️  Step 2: Seeding Oracle Database...${NC}"

# Copy scripts to container
echo -e "${YELLOW}Copying SQL files...${NC}"
docker cp backend/src/modules/identity/infrastructure/scripts/init.sql    oracle_lms:/tmp/identity_init.sql
docker cp backend/src/modules/identity/infrastructure/scripts/seed.sql    oracle_lms:/tmp/identity_seed.sql
docker cp backend/src/modules/academic/infrastructure/scripts/init.sql    oracle_lms:/tmp/academic_init.sql
docker cp backend/src/modules/academic/infrastructure/scripts/seed.sql    oracle_lms:/tmp/academic_seed.sql
docker cp backend/src/modules/analytic/infrastructure/scripts/init.sql    oracle_lms:/tmp/analytic_init.sql

# Run SQL scripts
echo -e "${YELLOW}Running SQL scripts...${NC}"
docker exec -i oracle_lms sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/identity_init.sql
docker exec -i oracle_lms sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/identity_seed.sql
docker exec -i oracle_lms sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/academic_init.sql
docker exec -i oracle_lms sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/academic_seed.sql
docker exec -i oracle_lms sqlplus your_oracle_user/123456@//localhost:1521/XEPDB1 @/tmp/analytic_init.sql

echo -e "${GREEN}✅ Oracle database seeded${NC}"

# Kill old backend processes
echo ""
echo -e "${BLUE}🛑 Cleaning up old processes...${NC}"
PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PID" ]; then
  echo -e "${YELLOW}Stopping old backend (PID: $PID)${NC}"
  kill -9 $PID 2>/dev/null || true
fi

sleep 1

# Start backend
echo ""
echo -e "${BLUE}🎯 Step 3: Starting Backend (port 3000)...${NC}"
cd "$PROJECT_ROOT/backend" || exit 1

echo -e "${YELLOW}Building...${NC}"
npm run build || {
  echo -e "${RED}Error: Backend build failed${NC}"
  exit 1
}

echo -e "${GREEN}✅ Backend built${NC}"
echo -e "${YELLOW}Starting dev server...${NC}"
npm run dev &
BACKEND_PID=$!

sleep 5

# Start frontend
echo ""
echo -e "${BLUE}🎨 Step 4: Starting Frontend (port 5173)...${NC}"
cd "$PROJECT_ROOT/frontend" || exit 1

echo -e "${YELLOW}Installing dependencies...${NC}"
npm install > /dev/null 2>&1

echo -e "${YELLOW}Starting dev server...${NC}"
npm run dev &
FRONTEND_PID=$!

sleep 3

# Display final status
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Development Environment Ready!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Services:${NC}"
echo "  🌐 Frontend:  http://localhost:5173"
echo "  📊 Backend:   http://localhost:3000"
echo "  🗄️  MongoDB:   localhost:27017"
echo "  💾 Redis:     localhost:6379"
echo "  🗃️  Oracle:    localhost:1521"
echo ""
echo -e "${BLUE}Test Data:${NC}"
echo "  Admin:    admin@school.edu.vn / Admin@123"
echo "  Teacher:  nguyen.van.an@school.edu.vn / Teacher@123"
echo "  Student:  sv001@student.school.edu.vn / Student@123"
echo ""
echo -e "${YELLOW}To stop: Press Ctrl+C${NC}"
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${BLUE}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Done!${NC}"
}

trap cleanup EXIT INT TERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
