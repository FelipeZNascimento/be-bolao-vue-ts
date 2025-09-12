// import { logger } from "@/config/logger";
// import { MetricsService } from "@/services/metrics.service";
import { ApiResponse } from "#utils/apiResponse.ts";
import { AppError } from "#utils/appError.ts";
import { NextFunction, Request, Response } from "express";

// const metricsService = new MetricsService();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction): void => {
  //   logger.error({
  //     context: "ErrorHandler",
  //     message: error.message,
  //     stack: error.stack,
  //   });

  //   const statusCode = error instanceof AppError ? error.statusCode : 500;
  //   const route = req.route?.path || req.path || "/unknown";

  //   metricsService.recordHttpRequest(req.method, route, statusCode, 0);

  if (error instanceof AppError) {
    ApiResponse.error(res, error.message, error.statusCode);
    return;
  }

  ApiResponse.error(res, "Internal server error", 500);
};
