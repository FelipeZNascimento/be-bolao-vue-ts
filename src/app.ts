import betRoutes from "#bet/bet.routes.js";
import config from "#database/config.js";
import { connection } from "#database/db.js";
import matchRoutes from "#match/match.routes.js";
import { errorHandler } from "#middlewares/errorHandler.js";
import { cache, middleware } from "#middlewares/middlewares.js";
import rankingRoutes from "#ranking/ranking.routes.js";
import seasonRoutes from "#season/season.routes.js";
import teamRoutes from "#team/team.routes.js";
import userRoutes from "#user/user.routes.js";
import { IUser } from "#user/user.types.js";
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
  /\.sharpion\.cloud$/,
];

const corsOptions = {
  credentials: true, // Allow cookies, if your application uses them
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 204,
  origin: allowedOrigins,
};
app.use(express.json());
app.use(cors(corsOptions));
app.use("/bolaonflv2/season", seasonRoutes);
app.use("/bolaonflv2/bet", betRoutes);
app.use("/bolaonflv2/ranking", rankingRoutes);
app.use("/bolaonflv2/user", userRoutes);
app.use("/bolaonflv2/match", matchRoutes);
app.use("/bolaonflv2/team", cache(), teamRoutes);

// app.options("*", cors());

app.get("/", [middleware]);

// Error Handler should be last
const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  console.log("Error middleware:", err);
  errorHandler(err as Error, req, res, next);
};
app.use(errorMiddleware);

export default app;
