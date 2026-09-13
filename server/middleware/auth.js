const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { jwtSecret } = require("../config/env");

const protect = async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw ApiError.unauthorized();
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  }

  const user = await User.findById(payload.sub).select("+tokenVersion");

  if (!user || !user.isActive) {
    throw ApiError.unauthorized("This account is no longer active");
  }

  if ((payload.v || 0) !== (user.tokenVersion || 0)) {
    throw ApiError.unauthorized("Your password was changed. Please sign in again.");
  }

  req.user = user;
  next();
};

const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw ApiError.forbidden();
  }
  next();
};

module.exports = { protect, authorize };
