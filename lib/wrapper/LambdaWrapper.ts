import * as cdk from "aws-cdk-lib";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import { SecretWrapper } from "./SecretWrapper";
import { VpcWrapper } from "./VpcWrapper";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface Props extends WrapperBaseProps {
  allowOrigins: string[];
  vpcWrapper: VpcWrapper;
  secretWrapper: SecretWrapper;
}

export class LambdaWrapper extends WrapperBase {
  public lambdas: {
    messagesGet: lambdaNodeJs.NodejsFunction;
    messagesPost: lambdaNodeJs.NodejsFunction;
  };
  private allowOrigins: string[];
  private vpcWrapper: VpcWrapper;
  private secretWrapper: SecretWrapper;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createLambdas();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { allowOrigins, vpcWrapper, secretWrapper } = props;

    this.allowOrigins = allowOrigins;
    this.vpcWrapper = vpcWrapper;
    this.secretWrapper = secretWrapper;
  };

  private readonly createLambdas = (): void => {
    const messagesGet = this.createLambda(
      "api-messages-get",
      path.join(__dirname, "..", "lambda", "api", "messages", "Get.ts"),
      true,
      {
        DB_SECRET_ID: this.secretWrapper.readerSecret.secretArn,
        ALLOW_ORIGINS: this.allowOrigins.join(","),
      }
    );
    this.secretWrapper.readerSecret.grantRead(messagesGet);
    const messagesPost = this.createLambda(
      "api-messages-post",
      path.join(__dirname, "..", "lambda", "api", "messages", "Post.ts"),
      true,
      {
        DB_SECRET_ID: this.secretWrapper.writerSecret.secretArn,
        ALLOW_ORIGINS: this.allowOrigins.join(","),
      }
    );
    this.secretWrapper.writerSecret.grantRead(messagesGet);

    this.lambdas = {
      messagesGet,
      messagesPost,
    };
  };

  private readonly createLambda = (
    nameSuffix: string,
    entry: string,
    isInVpc: boolean,
    environment?: {
      [key: string]: string;
    },
    timeoutSecond: number = 30,
    handler: string = "handler"
  ): lambdaNodeJs.NodejsFunction => {
    const lambdaId = `${this.appId}-${nameSuffix}`;
    const vpc = isInVpc ? this.vpcWrapper.vpc : undefined;
    const vpcSubnets = isInVpc
      ? { subnets: this.vpcWrapper.lambdaSubnets }
      : undefined;
    const securityGroups = isInVpc
      ? [this.vpcWrapper.lambdaSecurityGroup]
      : undefined;
    const lambdaFunction = new lambdaNodeJs.NodejsFunction(
      this.scope,
      lambdaId,
      {
        entry,
        handler: handler,
        functionName: lambdaId,
        environment,
        timeout: cdk.Duration.seconds(timeoutSecond),
        vpc,
        vpcSubnets,
        securityGroups,
        runtime: lambda.Runtime.NODEJS_20_X,
      }
    );
    return lambdaFunction;
  };
}
