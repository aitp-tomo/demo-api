#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as dotenv from "dotenv";
import { CdkPipelineStack } from "../lib/stack/CdkPipelineStack";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
const appId = `${process.env.APP_NAME!}-${process.env.ENV_NAME!}`;

const app = new cdk.App();
new CdkPipelineStack(app, `${appId}-stack`, {
  appName: process.env.APP_NAME!,
  envName: process.env.ENV_NAME!,
  dbName: process.env.DB_NAME!,
  repoOwnerName: process.env.REPO_OWNER_NAME!,
  repoName: process.env.REPO_NAME!,
  branchName: process.env.BRANCH_NAME!,
  connectionId: process.env.CONNECTION_ID!,
  s3LoggingBucketName: process.env.S3_LOGGING_BUCKET_NAME,
  readerNum: Number(process.env.READER_NUM),
  minAcu: Number(process.env.MIN_ACU),
  maxAcu: Number(process.env.MAX_ACU),
  allowOrigins: process.env.ALLOW_ORIGINS!.split(","),
  alertEmailAddresses: process.env.ALERT_EMAIL_ADDRESSES!.split(","),
  alarmActionsEnabled: process.env.ALARM_ACTIONS_ENABLED === "TRUE",
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-northeast-1",
  },
  terminationProtection: true,
});
