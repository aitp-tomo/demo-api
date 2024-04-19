import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface Props extends WrapperBaseProps {
  alertEmailAddresses: string[];
}

export class SnsWrapper extends WrapperBase {
  private alertEmailAddresses: string[];
  public alertTopic: sns.Topic;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createTopic();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { alertEmailAddresses } = props;

    this.alertEmailAddresses = alertEmailAddresses;
  };

  private readonly createTopic = (): void => {
    const alertTopicId = `${this.appId}-alert-topic`;
    this.alertTopic = new sns.Topic(this.scope, alertTopicId, {
      topicName: alertTopicId,
    });
    this.alertEmailAddresses.forEach((emailAddress) => {
      const subscription = new subscriptions.EmailSubscription(emailAddress);
      this.alertTopic.addSubscription(subscription);
    });
  };
}
