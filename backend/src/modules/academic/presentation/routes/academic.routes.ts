import { Router, RequestHandler } from "express";
import oracledb                   from "oracledb";

// Infrastructure
import { AcademicRepository }          from "../../infrastructure/repositories/AcademicRepository";

// Application — Queries 
import { GetSectionsByTeacherQuery }   from "../../application/queries/GetSectionsByTeacherQuery";
import { GetSectionsByStudentQuery }   from "../../application/queries/GetSectionsByStudentQuery";

// Presentation
import { AcademicController }          from "../../presentation/controllers/AcademicController";

// DI được wire thủ công theo pattern của project:
//   Infrastructure (Repository)
//     → Application (Query)
//       → Presentation (Controller)
//         → Route
//
// Nhận từ bên ngoài (server.ts):
//   oracleConnection  — dùng chung, không tạo mới mỗi request
//   authenticate      — requireAuthentication middleware (verify JWT)
//   authorizeViewSection — requireRole(VIEW_SECTION) middleware
//                          Student + Teacher + Admin đều có permission này
//                          (theo seed.sql)
//
// Route structure:
//   GET /academic/sections/teaching  — Teacher dashboard
//   GET /academic/sections/enrolled  — Student dashboard
export function createAcademicRouter(
  oracleConnection:     oracledb.Connection,
  authenticate:         RequestHandler,
  authorizeViewSection: RequestHandler,
): Router {
  const router = Router();

  // Infrastructure
  const academicRepository = new AcademicRepository(oracleConnection);

  // Queries (internal — chỉ Presentation Layer của Academic Module dùng)
  const getSectionsByTeacherQuery = new GetSectionsByTeacherQuery(academicRepository);
  const getSectionsByStudentQuery = new GetSectionsByStudentQuery(academicRepository);

  // Controller
  const controller = new AcademicController(
    getSectionsByTeacherQuery,
    getSectionsByStudentQuery,
  );

  // GET /academic/sections/teaching
  //   Teacher xem danh sách Section mình đang dạy
  //   Permission: VIEW_SECTION
  //   Response 200: TeachingSectionDTO[]
  router.get(
    "/sections/teaching",
    authenticate,
    authorizeViewSection,
    controller.getSectionsByTeacher.bind(controller),
  );

  // GET /academic/sections/enrolled
  //   Student xem danh sách Section mình đang học
  //   Permission: VIEW_SECTION
  //   Response 200: EnrolledSectionDTO[]
  router.get(
    "/sections/enrolled",
    authenticate,
    authorizeViewSection,
    controller.getSectionsByStudent.bind(controller),
  );

  return router;
}