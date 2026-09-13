const ApiError = require("../utils/ApiError");
const { isObjectId } = require("../utils/query");

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    throw ApiError.badRequest(details[0]?.message || "Invalid request data", details);
  }

  req.body = result.data;
  next();
};

const validateId = (param = "id") => (req, _res, next) => {
  if (!isObjectId(req.params[param])) {
    throw ApiError.notFound();
  }
  next();
};

module.exports = { validate, validateId };
