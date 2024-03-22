import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { DBWrapper } from "./DBWrapper";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";
import { SnsWrapper } from "./SnsWrapper";

interface Props extends WrapperBaseProps {
  scope: Construct;
  appId: string;
  dbWrapper: DBWrapper;
  snsWrapper: SnsWrapper;
  alarmActionsEnabled: boolean;
}

export class CloudWatchWrapper extends WrapperBase {
  private dbWrapper: DBWrapper;
  private snsWrapper: SnsWrapper;
  private lambdaExecNoticeAlarm: cloudwatch.Alarm;
  private lambdaExecAlertAlarm: cloudwatch.Alarm;
  private dbCpuUtilizationAlarm: cloudwatch.Alarm;
  private alarmActionsEnabled: boolean;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createAlarms();
    this.addAlarmActions();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { dbWrapper, snsWrapper, alarmActionsEnabled } = props;

    this.dbWrapper = dbWrapper;
    this.snsWrapper = snsWrapper;
    this.alarmActionsEnabled = alarmActionsEnabled;
  };

  private readonly createAlarms = (): void => {
    const metricLambdaExec = lambda.Function.metricAllConcurrentExecutions();
    const lambdaExecNoticeAlarmId = `${this.appId}-lambda-exec-notice-alarm`;
    this.lambdaExecNoticeAlarm = this.createAlarm(
      metricLambdaExec,
      250,
      lambdaExecNoticeAlarmId
    );
    const lambdaExecAlertAlarmId = `${this.appId}-lambda-exec-alert-alarm`;
    this.lambdaExecAlertAlarm = this.createAlarm(
      metricLambdaExec,
      500,
      lambdaExecAlertAlarmId
    );

    const metricDbCpuUtilization =
      this.dbWrapper.cluster.metricCPUUtilization();
    const dbCpuUtilizationAlarmId = `${this.appId}-db-cpu-util-alarm`;
    this.dbCpuUtilizationAlarm = this.createAlarm(
      metricDbCpuUtilization,
      65,
      dbCpuUtilizationAlarmId
    );
  };

  private readonly createAlarm = (
    metric: cloudwatch.Metric,
    threshold: number,
    alarmId: string,
    evaluationPeriods: number = 1
  ): cloudwatch.Alarm => {
    const alarm = new cloudwatch.Alarm(this.scope, alarmId, {
      metric,
      threshold,
      evaluationPeriods,
      actionsEnabled: this.alarmActionsEnabled,
      alarmName: alarmId,
    });
    return alarm;
  };

  private readonly addAlarmActions = (): void => {
    const noticeAction = new cloudwatchActions.SnsAction(
      this.snsWrapper.noticeTopic
    );
    const alertAction = new cloudwatchActions.SnsAction(
      this.snsWrapper.alertTopic
    );

    this.lambdaExecNoticeAlarm.addAlarmAction(noticeAction);
    this.lambdaExecAlertAlarm.addAlarmAction(alertAction);

    this.dbCpuUtilizationAlarm.addAlarmAction(alertAction);
  };
}
