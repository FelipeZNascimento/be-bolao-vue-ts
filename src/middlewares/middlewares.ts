import { RequestHandler } from "express";
import { NextFunction, Request, Response } from "express";

interface CacheOptions {
  duration?: number;
  private?: boolean;
}

export const cache = (options: CacheOptions = {}) => {
  const duration = options.duration ?? 300; // 5 minutes default

  return (req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", `${options.private ? "private" : "public"}, max-age=${duration.toString()}`);
    next();
  };
};

export const middleware: RequestHandler = (req, res) => {
  res.send("Hello World!");
};
