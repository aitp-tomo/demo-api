import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaWrapper } from "./LambdaWrapper";
import { AuthorizerWrapper } from "./AuthorizerWrapper";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface ApiMethod {
  methodOption: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  lambda: lambdaNodeJs.NodejsFunction;
  withAuthorizer?: boolean;
}

interface Props extends WrapperBaseProps {
  api: apigateway.RestApi;
  authorizerWrapper: AuthorizerWrapper;
  lambdaWrapper: LambdaWrapper;
}

export class ApiWrapper extends WrapperBase {
  private lambdaWrapper: LambdaWrapper;
  public api: apigateway.RestApi;
  private authorizerWrapper: AuthorizerWrapper;
  private optionsWithAuthorizer: apigateway.MethodOptions;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createOptions();
    this.addResources();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { api, authorizerWrapper, lambdaWrapper } = props;
    this.api = api;
    this.authorizerWrapper = authorizerWrapper;
    this.lambdaWrapper = lambdaWrapper;
  };

  private readonly createOptions = (): void => {
    this.optionsWithAuthorizer = {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: this.authorizerWrapper.authorizer.authorizerId,
      },
    };
  };

  private readonly addResources = (): void => {
    this.addResource(this.api.root, "messages", [
      {
        methodOption: "GET",
        lambda: this.lambdaWrapper.lambdas.messagesGet,
        withAuthorizer: true,
      },
      {
        methodOption: "POST",
        lambda: this.lambdaWrapper.lambdas.messagesPost,
        withAuthorizer: true,
      },
    ]);
  };

  private readonly addResource = (
    resource: apigateway.IResource,
    pathPart: string,
    apiMethods: ApiMethod[]
  ): apigateway.Resource => {
    const newResource = resource.addResource(pathPart);
    apiMethods.forEach((apiMethod) => {
      const integration = new apigateway.LambdaIntegration(apiMethod.lambda);
      const options = apiMethod.withAuthorizer
        ? this.optionsWithAuthorizer
        : undefined;
      newResource.addMethod(apiMethod.methodOption, integration, options);
    });
    return newResource;
  };
}
