import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";
import * as cognito from "aws-cdk-lib/aws-cognito";

interface Props extends WrapperBaseProps {
  api: apigateway.RestApi;
}

export class AuthorizerWrapper extends WrapperBase {
  private api: apigateway.RestApi;
  private userPool: cognito.UserPool;
  private userPoolClient: cognito.UserPoolClient;
  public authorizer: apigateway.CognitoUserPoolsAuthorizer;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createUserPool();
    this.addUserPoolClient();
    this.createAuthorizer();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { api } = props;

    this.api = api;
  };

  private createUserPool = (): void => {
    const userPoolId = `${this.appId}-user-pool`;
    this.userPool = new cognito.UserPool(this.scope, userPoolId, {
      userPoolName: userPoolId,
      selfSignUpEnabled: true,
      signInAliases: {
        username: true,
        email: true,
      },
    });
    new cdk.CfnOutput(this.scope, "UserPoolId", {
      value: this.userPool.userPoolId,
    });
  };

  private addUserPoolClient = (): void => {
    const userPoolClientId = `${this.appId}-user-pool-client`;
    this.userPoolClient = this.userPool.addClient(userPoolClientId, {
      userPoolClientName: userPoolClientId,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });
    new cdk.CfnOutput(this.scope, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
  };

  private createAuthorizer = (): void => {
    const authorizerId = `${this.appId}-authorizer`;
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this.scope,
      authorizerId,
      {
        cognitoUserPools: [this.userPool],
        authorizerName: authorizerId,
        identitySource: "method.request.header.Authorization",
      }
    );
    this.authorizer._attachToApi(this.api);
  };
}
