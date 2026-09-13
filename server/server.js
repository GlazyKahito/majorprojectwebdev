const app = require("./app");
const connectDB = require("./config/db");
const { port } = require("./config/env");

const start = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`CRM360 API listening on http://localhost:${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
