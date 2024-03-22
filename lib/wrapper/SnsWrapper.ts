import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface Props extends WrapperBaseProps {
  noticeEmailAddresses: string[];
  alertEmailAddresses: string[];
}

export class SnsWrapper extends WrapperBase {
  private noticeEmailAddresses: string[];
  private alertEmailAddresses: string[];
  public noticeTopic: sns.Topic;
  public alertTopic: sns.Topic;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createTopics();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { noticeEmailAddresses, alertEmailAddresses } = props;

    this.noticeEmailAddresses = noticeEmailAddresses;
    this.alertEmailAddresses = alertEmailAddresses;
  };

  private readonly createTopics = (): void => {
    const noticeTopicId = `${this.appId}-notice-topic`;
    this.noticeTopic = this.createTopic(
      noticeTopicId,
      this.noticeEmailAddresses
    );
    const alertTopicId = `${this.appId}-alert-topic`;
    this.alertTopic = this.createTopic(alertTopicId, this.alertEmailAddresses);
  };

  private readonly createTopic = (
    topicId: string,
    emailAddresses: string[]
  ): sns.Topic => {
    const topic = new sns.Topic(this.scope, topicId, {
      topicName: topicId,
    });
    emailAddresses.forEach((emailAddress) => {
      const subscription = new subscriptions.EmailSubscription(emailAddress);
      topic.addSubscription(subscription);
    });
    return topic;
  };
}
