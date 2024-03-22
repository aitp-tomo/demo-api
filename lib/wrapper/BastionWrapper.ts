import * as fs from "fs";
import { join } from "path";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { VpcWrapper } from "./VpcWrapper";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface Props extends WrapperBaseProps {
  vpcWrapper: VpcWrapper;
  s3LoggingBucketName?: string;
}

export class BastionWrapper extends WrapperBase {
  private bastionId: string;
  private vpcWrapper: VpcWrapper;
  private role: iam.Role;
  private profile: iam.CfnInstanceProfile;
  private s3LoggingBucketName: string | undefined;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createProfile();
    this.grantWriteLog();
    this.createInstance();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { vpcWrapper, s3LoggingBucketName } = props;
    this.bastionId = `${this.appId}-bastion`;
    this.vpcWrapper = vpcWrapper;
    this.s3LoggingBucketName = s3LoggingBucketName;
  };

  private readonly createProfile = (): void => {
    const roleName = `${this.bastionId}-role`;
    this.role = new iam.Role(this.scope, roleName, {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      roleName,
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(
          this.scope,
          `${roleName}-policy`,
          "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
        ),
      ],
    });
    const instanceProfileName = `${this.bastionId}-profile`;
    this.profile = new iam.CfnInstanceProfile(this.scope, instanceProfileName, {
      roles: [this.role.roleName],
      instanceProfileName,
    });
  };

  private readonly createInstance = (): void => {
    const instanceType = ec2.InstanceType.of(
      ec2.InstanceClass.T2,
      ec2.InstanceSize.MICRO
    );
    const machineImage = ec2.MachineImage.latestAmazonLinux2023();
    const instanceName = `${this.bastionId}-instance`;
    new ec2.CfnInstance(this.scope, instanceName, {
      availabilityZone: this.vpcWrapper.bastionSubnet.availabilityZone,
      disableApiTermination: false,
      instanceType: instanceType.toString(),
      iamInstanceProfile: this.profile.instanceProfileName!,
      imageId: machineImage.getImage(this.scope).imageId,
      networkInterfaces: [
        {
          deviceIndex: "0",
          associatePublicIpAddress: true,
          deleteOnTermination: true,
          associateCarrierIpAddress: false,
          groupSet: [this.vpcWrapper.bastionSecurityGroup.securityGroupId],
          subnetId: this.vpcWrapper.bastionSubnet.subnetId,
        },
      ],
      tags: [
        {
          key: "Name",
          value: instanceName,
        },
      ],
      userData: fs.readFileSync(
        join(__dirname, "..", "assets", "userData.sh"),
        "base64"
      ),
    });
  };

  private readonly grantWriteLog = (): void => {
    if (this.s3LoggingBucketName) {
      const s3LoggingBucket = s3.Bucket.fromBucketName(
        this.scope,
        `${this.bastionId}-s3-logging-bucket`,
        this.s3LoggingBucketName
      );
      s3LoggingBucket.grantPut(this.role);
      s3LoggingBucket.grantPutAcl(this.role);
      this.role.addToPolicy(
        new iam.PolicyStatement({
          actions: ["s3:GetEncryptionConfiguration"],
          resources: [s3LoggingBucket.bucketArn],
        })
      );
    }
  };
}
