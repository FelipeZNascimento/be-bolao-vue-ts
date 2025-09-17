import betRoutes from "#bet/bet.routes.ts";
import config from "#database/config.ts";
import { connection } from "#database/db.ts";
import matchRoutes from "#match/match.routes.ts";
import { errorHandler } from "#middlewares/errorHandler.ts";
import { cache, middleware } from "#middlewares/middlewares.ts";
import rankingRoutes from "#ranking/ranking.routes.ts";
import seasonRoutes from "#season/season.routes.ts";
import teamRoutes from "#team/team.routes.ts";
import userRoutes from "#user/user.routes.ts";
import { IUser } from "#user/user.types.ts";
import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import mySqlSession from "express-mysql-session";
import expressSession from "express-session";

const app = express();
const environment = process.env.NODE_ENV ?? "development";
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const sessionSecret = process.env.SESSION_SECRET ?? "this is not secure";

export interface ISessionSettings extends expressSession.SessionOptions {
  user: IUser | undefined;
}

const sessionSettings: ISessionSettings = {
  cookie: {
    maxAge: sevenDays,
    sameSite: environment === "production" ? "none" : "strict",
    secure: environment === "production",
  },
  resave: true,
  rolling: true,
  saveUninitialized: false,
  secret: sessionSecret,
  user: undefined,
};
// @ts-expect-error Types are correct, but check is failing
const expressStore = mySqlSession(expressSession);
// @ts-expect-error Types are correct, but check is failing
const sessionStore = new expressStore(config.db, connection);

app.use(
  expressSession({
    ...sessionSettings,
    store: sessionStore,
  }),
);

sessionStore
  .onReady()
  .then(() => {
    // MySQL session store ready for use.
    console.log("MySQLStore ready");
  })
  .catch((error: unknown) => {
    // Something went wrong.
    console.error("Error: ", error);
  });

const allowedOrigins = [
  "https://localhost",
  "http://localhost",
  "http://127.0.0.1:3000",
  "https://localhost:3000",
  "http://localhost:3000",
  /\.omegafox\.me$/,
];

const corsOptions = {
  credentials: true, // Allow cookies, if your application uses them
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  origin: allowedOrigins,
};
app.use(express.json());
app.use(cors(corsOptions));
app.use("/bolaonfl/season", seasonRoutes);
app.use("/bolaonfl/bet", betRoutes);
app.use("/bolaonfl/ranking", rankingRoutes);
app.use("/bolaonfl/user", userRoutes);
app.use("/bolaonfl/match", matchRoutes);
app.use("/bolaonfl/team", cache(), teamRoutes);

// app.options("*", cors());

app.get("/", [middleware]);

// Error Handler should be last
const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  console.log("Error middleware:", err);
  errorHandler(err as Error, req, res, next);
};
app.use(errorMiddleware);

export default app;
