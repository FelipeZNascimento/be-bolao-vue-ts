import initRoutes from "#init/init.routes.ts";
import matchRoutes from "#match/match.routes.ts";
import { cache, middleware } from "#middlewares/middlewares.ts";
import teamRoutes from "#team/team.routes.ts";
import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT ?? "9001";

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
  // headers: 'Content-Type, Authorization, Content-Length, X-Requested-With',
};

// app.use("/bolaonfl/initialize", initializeRoutes);
app.use("/bolaonfl/match", matchRoutes);
app.use("/bolaonfl/team", cache(), teamRoutes);
app.use("/bolaonfl/init", cache(), initRoutes);
app.use(cors(corsOptions));
app.use(express.json()); // To parse data into json

// app.options("*", cors());

app.get("/", middleware);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
