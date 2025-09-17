import mysql from "mysql2/promise";

import config from "./config.ts";

export const connection = mysql.createPool(config.db);

connection.on("connection", function (connection) {
  // handy for testing
  console.log("Pool id %d connected", connection.threadId);
});

connection.on("enqueue", function () {
  // handy for testing
  console.log("Waiting for available connection slot");
});

connection.on("acquire", function (connection) {
  // handy for testing
  console.log("Connection %d acquired", connection.threadId);
});

connection.on("release", function (connection) {
  // handy for testing
  console.log("Connection %d released", connection.threadId);
});

async function query(sql: string, params: any) {
  const [results] = await connection.query(sql, params);
  return results;
}

// Soft shutdown handler
const handleShutdown = () => {
  console.log("Shutting down database connection");
  connection.destroy();
};

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);

export default {
  query,
};
