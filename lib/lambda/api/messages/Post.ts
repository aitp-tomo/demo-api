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
  HTTP404Error,
  HTTP401Error,
  HTTP403Error,
} from "../common/error";
import { MysqlWrapper } from "../common/mysqlWrapper";

const DB_SECRET_ID = process.env.DB_SECRET_ID!;

const validate = (event: APIGatewayProxyEventV2, userId: string): string => {
  if (!userId) {
    throw new HTTP401Error("ユーザーIDが取得できませんでした");
  }
  if (!event.body) {
    throw new HTTP403Error("登録情報を入力してください");
  }
  const body = JSON.parse(event.body);
  const content = body.content;
  if (!content) {
    throw new HTTP403Error("メッセージ内容を指定してください");
  }

  if (typeof content !== "string") {
    throw new HTTP403Error("メッセージ内容の形式が不正です");
  }
  if (content.length > 1000) {
    throw new HTTP403Error("メッセージ内容は最大1000字までです");
  }
  return content;
};

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const result = getResultBase();
  let userId: string | undefined;
  try {
    userId = getUserInfo(event, "sub");
    const content = validate(event, userId);

    const mysqlWrapper = new MysqlWrapper();
    await mysqlWrapper.createConnection(DB_SECRET_ID);
    try {
      await mysqlWrapper.beginTransaction();
      await mysqlWrapper.execute(
        `
            INSERT INTO
                messages
                (
                    content,
                    user_id
                )
            VALUES(
                ?,
                ?
            )
        `,
        [content, userId]
      );
      await mysqlWrapper.commit();
    } catch (mysqlError) {
      await mysqlWrapper.rollback();
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
