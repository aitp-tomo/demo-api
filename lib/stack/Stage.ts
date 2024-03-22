import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MainStack, MainStackProps } from "./MainStack";

export interface StageProps extends MainStackProps {}

export class Stage extends cdk.Stage {
  private appId: string;

  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);
    this.initialize(props);
  }

  private readonly initialize = (props: StageProps): void => {
    this.setValues(props);
    this.deployApp(props);
  };

  private readonly setValues = (props: StageProps): void => {
    const { appName, envName } = props;
    this.appId = `${appName}-${envName}`;
  };

  private readonly deployApp = (props: StageProps): void => {
    new MainStack(this, `${this.appId}-main-stack`, props);
  };
}
