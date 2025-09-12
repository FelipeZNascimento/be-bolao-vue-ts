import { Response } from "express";

export const ApiResponse = {
  error(res: Response, message: string, statusCode = 400, code?: string): void {
    res.status(statusCode).json({
      code,
      message,
      success: false,
      ...(process.env.NODE_ENV === "development" && { stack: new Error().stack }),
    });
  },

  success(res: Response, data: any = null, message = "Success"): void {
    res.status(200).json({
      data,
      message,
      success: true,
    });
  },
};

export const isRejected = (input: PromiseSettledResult<unknown>): input is PromiseRejectedResult =>
  input.status === "rejected";
export const isFulfilled = <T>(p: PromiseSettledResult<T>): p is PromiseFulfilledResult<T> => p.status === "fulfilled";
