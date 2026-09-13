const mongoose = require("mongoose");
const { mongoUri } = require("./env");

mongoose.set("strictQuery", true);

let cached = global.__crm360Mongo;

if (!cached) {
  cached = global.__crm360Mongo = { conn: null, promise: null };
}

async function connectDB(uri = mongoUri) {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10000, maxPoolSize: 10 })
      .then((instance) => instance)
      .catch((error) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
