/* eslint-disable @typescript-eslint/no-explicit-any */
import { ErrorCode } from "#utils/errorCodes.js";

export class ErrorHandler extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;
  public readonly statusCode: number;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    isOperational = true,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const isAppError = (error: any): error is ErrorHandler => {
  console.log("isAppError: ", error);
  return error instanceof ErrorHandler;
};
