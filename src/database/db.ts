import mysql from "mysql2/promise";

import config from "./config.ts";

async function query(sql: string, params: any) {
  const connection = await mysql.createConnection(config.db);
  const [results] = await connection.query(sql, params);
  return results;
}

export default {
  query,
};
