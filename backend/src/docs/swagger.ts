import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import openApiDocument from "./openapi";

export function createSwaggerRouter(): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });

  router.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "E-Learning LMS API Docs",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );

  return router;
}
