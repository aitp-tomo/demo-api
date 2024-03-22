import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

export class HTTP401Error extends Error {}
export class HTTP403Error extends Error {}
export class HTTP404Error extends Error {}

export const getErrorStatusCode = (error: any): number => {
  if (error instanceof HTTP401Error) {
    return 401;
  } else if (error instanceof HTTP403Error) {
    return 403;
  } else if (error instanceof HTTP404Error) {
    return 404;
  } else {
    return 500;
  }
};

export const getErrorMessage = (error: any): string => {
  if (
    error instanceof HTTP401Error ||
    error instanceof HTTP403Error ||
    error instanceof HTTP404Error
  ) {
    return error.message;
  } else {
    return "予期せぬエラーが発生しました";
  }
};

export const writeErrorLog = (
  event: APIGatewayProxyEventV2,
  result: APIGatewayProxyResultV2,
  error: any,
  userId?: string
): void => {
  const writableEvent = { ...event };
  writableEvent.headers["Authorization"] = "*****";
  const log = {
    event: writableEvent,
    result,
    userId,
    error,
  };
  console.log(log);
};
