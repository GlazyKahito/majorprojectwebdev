const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { corsOrigins, isProduction } = require("./config/env");
const connectDB = require("./config/db");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin) || !isProduction) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: "200kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Slow down and try again shortly." },
  })
);

app.use("/api", async (_req, _res, next) => {
  await connectDB();
  next();
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
