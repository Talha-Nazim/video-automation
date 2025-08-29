import express from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();
const PORT = 3000;

// Swagger setup
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Video Automation API",
      version: "1.0.0",
      description: "API for generating scripts and creating videos",
    },
  },
  apis: ["./src/index.js"], // Path to API docs
};

const swaggerSpec = swaggerJsdoc(options);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Test endpoint
/**
 * @openapi
 * /hello:
 *   get:
 *     summary: Returns a hello message
 *     responses:
 *       200:
 *         description: Success
 */
app.get("/hello", (req, res) => {
  res.json({ message: "Hello World!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 Swagger docs at http://localhost:${PORT}/docs`);
});

