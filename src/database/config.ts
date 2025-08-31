const config = {
  db: {
    database: process.env.SQL_DB,
    host: process.env.SQL_HOST,
    password: process.env.SQL_PASS,
    user: process.env.SQL_USER,
  },
  listPerPage: 100,
  port: 3000,
};
export default config;
