const swaggerJsdoc = require("swagger-jsdoc");

function createSwaggerSpec() {
  return swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Onnonn API",
        version: "1.0.0",
        description: "AI-powered meeting platform backend"
      },
      servers: [{ url: "/api/v1" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    },
    apis: ["./src/routes/**/*.js", "./src/controllers/**/*.js"]
  });
}

module.exports = { createSwaggerSpec };
