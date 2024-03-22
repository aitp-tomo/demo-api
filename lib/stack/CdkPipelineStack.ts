import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { MainStack, MainStackProps } from "./MainStack";
import { StackBase, StackBaseProps } from "./StackBase";
import { Stage, StageProps } from "./Stage";

interface Props extends StageProps {
  branchName: string;
  repoOwnerName: string;
  repoName: string;
  connectionId: string;
}

export class CdkPipelineStack extends StackBase {
  private branchName: string;
  private repoOwnerName: string;
  private repoName: string;
  private connectionId: string;
  private pipeline: pipelines.CodePipeline;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createPipeline();
    this.addStage(props);
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { branchName, repoOwnerName, repoName, connectionId } = props;

    this.branchName = branchName;
    this.repoOwnerName = repoOwnerName;
    this.repoName = repoName;
    this.connectionId = connectionId;
  };

  private readonly createPipeline = (): void => {
    const pipelineId = `${this.appId}-pipeline`;
    this.pipeline = new pipelines.CodePipeline(this, pipelineId, {
      pipelineName: pipelineId,
      synth: new pipelines.ShellStep(`${pipelineId}-shell-step`, {
        input: pipelines.CodePipelineSource.connection(
          `${this.repoOwnerName}/${this.repoName}`,
          this.branchName,
          {
            connectionArn: `arn:aws:codestar-connections:${this.region}:${this.account}:connection/${this.connectionId}`,
          }
        ),
        commands: ["npm ci", "npm run build", "npm run test", "npx cdk synth"],
      }),
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
    });
  };

  private readonly addStage = (props: Props): void => {
    const app = new Stage(this, `${this.appId}-stage`, props);
    this.pipeline.addStage(app);
  };
}
