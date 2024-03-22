import { APIGatewayProxyEventV2 } from "aws-lambda";
import * as jose from "node-jose";

export const getResultBase = (
  origin: string,
  allowOrigins: string[],
  statusCode: number = 200
) => {
  const allowOrigin = allowOrigins.includes("*")
    ? "*"
    : allowOrigins.includes(origin)
    ? origin
    : "";
  const result = {
    statusCode,
    body: JSON.stringify(true),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "*",
    },
  };
  return result;
};

export const getUserInfo = (
  event: APIGatewayProxyEventV2,
  key: string
): string => {
  try {
    const token = event.headers["Authorization"];
    const sections = token?.split(".");
    const payload = jose.util.base64url.decode(sections![1]);
    const parsedPayload = JSON.parse(payload.toString());
    const result: string = parsedPayload[key];
    return result;
  } catch (error) {
    console.log(error);
    return "";
  }
};
