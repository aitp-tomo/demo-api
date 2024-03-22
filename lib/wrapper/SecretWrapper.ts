import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { DBWrapper } from "./DBWrapper";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface Props extends WrapperBaseProps {
  dbWrapper: DBWrapper;
}

export class SecretWrapper extends WrapperBase {
  private dbWrapper: DBWrapper;
  public writerSecret: secretsmanager.Secret;
  public readerSecret: secretsmanager.Secret;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createSecrets();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { dbWrapper } = props;

    this.dbWrapper = dbWrapper;
  };

  private readonly createSecrets = (): void => {
    this.createSecret("developer", true);
    this.writerSecret = this.createSecret("writer", true);
    this.readerSecret = this.createSecret("reader", false);
  };

  private readonly createSecret = (
    username: string,
    isWriter: boolean
  ): secretsmanager.Secret => {
    const endpoint = isWriter
      ? this.dbWrapper.cluster.clusterEndpoint
      : this.dbWrapper.cluster.clusterReadEndpoint;
    const secretId = `${this.dbWrapper.clusterId}-${username}-secret`;
    const secret = new secretsmanager.Secret(this.scope, secretId, {
      secretName: secretId,
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
        secretStringTemplate: JSON.stringify({
          username,
          host: endpoint.hostname,
          engine: "mysql",
          port: endpoint.port.toString(),
          dbClusterIdentifier: this.dbWrapper.cluster.clusterIdentifier,
          dbname: this.dbWrapper.dbName,
        }),
      },
    });
    return secret;
  };
}
