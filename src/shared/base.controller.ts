import type { NextFunction, Request, Response } from "express";

import { ApiResponse } from "#utils/apiResponse.ts";

export abstract class BaseController {
  protected async handleRequest<T>(
    req: Request,
    res: Response,
    next: NextFunction,
    action: () => Promise<T>,
  ): Promise<void> {
    try {
      const result: T = await action();
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  protected handleRequestFromCache(req: Request, res: Response, next: NextFunction, value: any): void {
    try {
      ApiResponse.success(res, value);
    } catch (error) {
      next(error);
    }
  }
}
