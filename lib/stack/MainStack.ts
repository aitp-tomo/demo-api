import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { StackBaseProps, StackBase } from "./StackBase";
import { VpcWrapper } from "../wrapper/VpcWrapper";
import { DBWrapper } from "../wrapper/DBWrapper";
import { SecretWrapper } from "../wrapper/SecretWrapper";
import { LambdaWrapper } from "../wrapper/LambdaWrapper";
import { ApiWrapper } from "../wrapper/ApiWrapper";
import { AuthorizerWrapper } from "../wrapper/AuthorizerWrapper";
import { SnsWrapper } from "../wrapper/SnsWrapper";
import { CloudWatchWrapper } from "../wrapper/CloudWatchWrapper";
import { BastionWrapper } from "../wrapper/BastionWrapper";

export interface MainStackProps extends StackBaseProps {
  allowOrigins: string[];
  dbName: string;
  readerNum: number;
  minAcu: number;
  maxAcu: number;
  s3LoggingBucketName?: string;
  noticeEmailAddresses: string[];
  alertEmailAddresses: string[];
  alarmActionsEnabled: boolean;
}

export class MainStack extends StackBase {
  private allowOrigins: string[];
  private api: apigateway.RestApi;
  private dbName: string;
  private minAcu: number;
  private maxAcu: number;
  private readerNum: number;
  private s3LoggingBucketName: string | undefined;
  private noticeEmailAddresses: string[];
  private alertEmailAddresses: string[];
  private alarmActionsEnabled: boolean;

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    this.initialize(props);
  }

  private readonly initialize = (props: MainStackProps): void => {
    this.setAdditionalValues(props);
    this.createApi();
    this.createArchitectures();
  };

  private readonly setAdditionalValues = (props: MainStackProps): void => {
    const {
      allowOrigins,
      dbName,
      minAcu,
      maxAcu,
      readerNum,
      s3LoggingBucketName,
      noticeEmailAddresses,
      alertEmailAddresses,
      alarmActionsEnabled,
    } = props;

    this.allowOrigins = allowOrigins;
    this.dbName = dbName;
    this.minAcu = minAcu;
    this.maxAcu = maxAcu;
    this.readerNum = readerNum;
    this.s3LoggingBucketName = s3LoggingBucketName;
    this.noticeEmailAddresses = noticeEmailAddresses;
    this.alertEmailAddresses = alertEmailAddresses;
    this.alarmActionsEnabled = alarmActionsEnabled;
  };

  private readonly createApi = () => {
    const apiId = `${this.appId}-api`;
    this.api = new apigateway.RestApi(this, apiId, {
      defaultCorsPreflightOptions: {
        allowOrigins: this.allowOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["*"],
        statusCode: 200,
      },
      restApiName: apiId,
      deployOptions: {
        stageName: this.envName,
      },
    });
  };

  private readonly createArchitectures = (): void => {
    const commonProps = {
      scope: this,
      appId: this.appId,
    };
    const vpcWrapper = new VpcWrapper({ ...commonProps });
    const dbWrapper = new DBWrapper({
      ...commonProps,
      vpcWrapper,
      dbName: this.dbName,
      readerNum: this.readerNum,
      minAcu: this.minAcu,
      maxAcu: this.maxAcu,
    });
    const secretWrapper = new SecretWrapper({ ...commonProps, dbWrapper });
    const lambdaWrapper = new LambdaWrapper({
      ...commonProps,
      vpcWrapper,
      secretWrapper,
      allowOrigins: this.allowOrigins,
    });
    const authorizerWrapper = new AuthorizerWrapper({
      ...commonProps,
      api: this.api,
    });
    new ApiWrapper({
      ...commonProps,
      api: this.api,
      authorizerWrapper,
      lambdaWrapper,
    });
    new BastionWrapper({
      ...commonProps,
      vpcWrapper,
      s3LoggingBucketName: this.s3LoggingBucketName,
    });
    const snsWrapper = new SnsWrapper({
      ...commonProps,
      noticeEmailAddresses: this.noticeEmailAddresses,
      alertEmailAddresses: this.alertEmailAddresses,
    });
    new CloudWatchWrapper({
      ...commonProps,
      dbWrapper,
      snsWrapper,
      alarmActionsEnabled: this.alarmActionsEnabled,
    });
  };
}
