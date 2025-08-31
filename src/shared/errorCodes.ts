/* eslint-disable perfectionist/sort-enums */
export enum ErrorCode {
  // Authentication Errors (1xxx)
  UNAUTHORIZED = "ERR_1001",
  INVALID_CREDENTIALS = "ERR_1002",
  TOKEN_EXPIRED = "ERR_1003",
  INVALID_TOKEN = "ERR_1004",

  // Authorization Errors (2xxx)
  FORBIDDEN = "ERR_2001",
  INSUFFICIENT_PERMISSIONS = "ERR_2002",

  // Validation Errors (3xxx)
  INVALID_INPUT = "ERR_3001",
  MISSING_REQUIRED_FIELD = "ERR_3002",
  INVALID_EMAIL = "ERR_3003",
  INVALID_PASSWORD = "ERR_3004",
  INVALID_REQUEST = "ERR_3005",

  // Resource Errors (4xxx)
  NOT_FOUND = "ERR_4001",
  ALREADY_EXISTS = "ERR_4002",
  CONFLICT = "ERR_4003",

  // Database Errors (5xxx)
  DB_ERROR = "ERR_5001",
  DB_CONNECTION_ERROR = "ERR_5002",
  DB_QUERY_ERROR = "ERR_5003",

  // Server Errors (6xxx)
  INTERNAL_SERVER_ERROR = "ERR_6001",
  SERVICE_UNAVAILABLE = "ERR_6002",
  EXTERNAL_SERVICE_ERROR = "ERR_6003",

  // Validation Errors (3xxx)
  VALIDATION_ERROR = "ERR_3006",
}
