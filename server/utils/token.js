const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role, v: user.tokenVersion || 0 }, jwtSecret, { expiresIn: jwtExpiresIn });

module.exports = { signToken };
