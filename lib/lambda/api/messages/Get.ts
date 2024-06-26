import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { getResultBase, getUserInfo } from "../common/utils";
import {
  getErrorStatusCode,
  getErrorMessage,
  writeErrorLog,
  HTTP401Error,
  HTTP403Error,
} from "../common/error";
import { MysqlWrapper } from "../common/MysqlWrapper";

const DB_SECRET_ID = process.env.DB_SECRET_ID!;
const ALLOW_ORIGINS = process.env.ALLOW_ORIGINS!.split(",");

const validate = (
  event: APIGatewayProxyEventV2,
  userId: string
): number | undefined => {
  if (!userId) {
    throw new HTTP401Error("ユーザーIDが取得できませんでした");
  }
  let id: number | undefined;
  if (event.queryStringParameters && event.queryStringParameters["id"]) {
    id = Number(event.queryStringParameters["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HTTP403Error("IDの指定が不正です");
    }
  }
  return id;
};

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const result = getResultBase(event.headers.origin!, ALLOW_ORIGINS);
  let userId: string | undefined;
  try {
    userId = getUserInfo(event, "sub");
    const id = validate(event, userId);

    const mysqlWrapper = new MysqlWrapper();
    await mysqlWrapper.createConnection(DB_SECRET_ID);
    try {
      const selectResult = await mysqlWrapper.execute(
        `
        SELECT
          *
        FROM
          messages
        ${id ? "WHERE id = ?" : ""}
        `,
        id ? [id] : []
      );
      result.body = JSON.stringify(selectResult);
    } catch (mysqlError) {
      throw mysqlError;
    } finally {
      await mysqlWrapper.end();
    }
  } catch (error) {
    result.statusCode = getErrorStatusCode(error);
    result.body = getErrorMessage(error);
    writeErrorLog(event, result, error, userId);
  }
  return result;
};
