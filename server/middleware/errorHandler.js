const ApiError = require("../utils/ApiError");
const { isProduction } = require("../config/env");

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let details = err.details;

  if (err.name === "ValidationError") {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0]?.message || "Invalid data";
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `An account with this ${field} already exists`;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) {
    console.error(err);
    if (isProduction) message = "Something went wrong on our end. Please try again.";
  }

  res.status(status).json({ message, ...(details ? { details } : {}) });
};

module.exports = { notFound, errorHandler };
