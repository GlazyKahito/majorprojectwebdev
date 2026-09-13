const { MongoMemoryServer } = require("mongodb-memory-server");

(async () => {
  const mongod = await MongoMemoryServer.create({ instance: { dbName: "crm360" } });
  process.env.MONGODB_URI = mongod.getUri("crm360");
  process.env.JWT_SECRET = process.env.JWT_SECRET || "local-memory-server-secret-change-me";

  const connectDB = require("../config/db");
  const { seedDatabase } = require("./seed");
  const app = require("../app");
  const { port } = require("../config/env");

  await connectDB();
  await seedDatabase({ log: () => {} });

  app.listen(port, () => {
    console.log(`CRM360 API (in-memory MongoDB, seeded) on http://localhost:${port}`);
  });

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
