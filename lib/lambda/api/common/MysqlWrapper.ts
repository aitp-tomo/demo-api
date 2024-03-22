import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import * as mysql from "mysql2/promise";

export class MysqlWrapper {
  private connection: mysql.Connection;
  public readonly createConnection = async (
    secretId: string
  ): Promise<void> => {
    const client = new SecretsManagerClient({});
    const command = new GetSecretValueCommand({
      SecretId: secretId,
    });
    const response = await client.send(command);
    const connectionInfo = JSON.parse(response.SecretString!);
    this.connection = await mysql.createConnection({
      host: connectionInfo.host,
      port: connectionInfo.port,
      user: connectionInfo.username,
      password: connectionInfo.password,
      database: connectionInfo.dbname,
    });
  };

  public readonly beginTransaction = async (): Promise<void> => {
    await this.connection.beginTransaction();
  };

  public readonly execute = async (sql: string, values: any): Promise<any> => {
    const [result] = await this.connection.execute(sql, values);
    return result;
  };

  public readonly commit = async (): Promise<void> => {
    await this.connection.commit();
  };

  public readonly rollback = async (): Promise<void> => {
    await this.connection.rollback();
  };

  public readonly end = async (): Promise<void> => {
    await this.connection.end();
  };
}
