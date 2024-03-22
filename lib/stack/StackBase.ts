import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface StackBaseProps extends cdk.StackProps {
  appName: string;
  envName: string;
}

export class StackBase extends cdk.Stack {
  protected appId: string;
  protected appName: string;
  protected envName: string;

  constructor(scope: Construct, id: string, props: StackBaseProps) {
    super(scope, id, props);
    this.setValues(props);
  }

  private readonly setValues = (props: StackBaseProps): void => {
    const { appName, envName } = props;

    this.appName = appName;
    this.envName = envName;
    this.appId = `${this.appName}-${this.envName}`;
  };
}
