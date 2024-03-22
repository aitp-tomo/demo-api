import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface SubnetProps {
  nameSuffix: string;
  availabilityZone: string;
  cidrBlock: string;
}

const IP_PROTOCOL = "tcp";
const DB_PORT = 3306;
const HTTPS_PORT = 443;
const HTTP_PORT = 80;

interface Props extends WrapperBaseProps {}

export class VpcWrapper extends WrapperBase {
  public vpc: ec2.Vpc;
  private readonly lambdaSubnetPropsList: SubnetProps[] = [
    {
      nameSuffix: "lambda-subnet1",
      availabilityZone: "ap-northeast-1a",
      cidrBlock: "10.0.0.0/24",
    },
    {
      nameSuffix: "lambda-subnet2",
      availabilityZone: "ap-northeast-1c",
      cidrBlock: "10.0.1.0/24",
    },
    {
      nameSuffix: "lambda-subnet3",
      availabilityZone: "ap-northeast-1d",
      cidrBlock: "10.0.2.0/24",
    },
  ];
  public lambdaSubnets: ec2.PrivateSubnet[];
  private readonly dbSubnetPropsList: SubnetProps[] = [
    {
      nameSuffix: "db-subnet1",
      availabilityZone: "ap-northeast-1a",
      cidrBlock: "10.0.10.0/24",
    },
    {
      nameSuffix: "db-subnet2",
      availabilityZone: "ap-northeast-1c",
      cidrBlock: "10.0.11.0/24",
    },
    {
      nameSuffix: "db-subnet3",
      availabilityZone: "ap-northeast-1d",
      cidrBlock: "10.0.12.0/24",
    },
  ];
  public dbSubnets: ec2.PrivateSubnet[];
  private readonly bastionSubnetProps: SubnetProps = {
    nameSuffix: "bastion-subnet1",
    availabilityZone: "ap-northeast-1a",
    cidrBlock: "10.0.20.0/24",
  };
  public bastionSubnet: ec2.PublicSubnet;
  private readonly endpointSubnetPropsList: SubnetProps[] = [
    {
      nameSuffix: "endpoint-subnet1",
      availabilityZone: "ap-northeast-1a",
      cidrBlock: "10.0.30.0/24",
    },
    {
      nameSuffix: "endpoint-subnet2",
      availabilityZone: "ap-northeast-1c",
      cidrBlock: "10.0.31.0/24",
    },
    {
      nameSuffix: "endpoint-subnet3",
      availabilityZone: "ap-northeast-1d",
      cidrBlock: "10.0.32.0/24",
    },
  ];
  private endpointSubnets: ec2.PublicSubnet[];
  private internetGateway: ec2.CfnInternetGateway;
  public lambdaSecurityGroup: ec2.SecurityGroup;
  public dbSecurityGroup: ec2.SecurityGroup;
  public bastionSecurityGroup: ec2.SecurityGroup;
  private endpointSecurityGroup: ec2.SecurityGroup;

  constructor(props: Props) {
    super(props);
    this.initialize();
  }

  private readonly initialize = (): void => {
    this.createVpc();
    this.createSubnets();
    this.manageInternetGateway();
    this.createSecurityGroups();
    this.createSecurityGroupIngresses();
    this.createSecurityGroupEgresses();
    this.createEndpoint();
  };

  private readonly createVpc = (): void => {
    const vpcId = `${this.appId}-vpc`;
    this.vpc = new ec2.Vpc(this.scope, vpcId, {
      vpcName: vpcId,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      natGateways: 0,
      subnetConfiguration: [],
    });
  };

  private readonly createSubnets = (): void => {
    this.lambdaSubnets = this.lambdaSubnetPropsList.map((subnetProps) => {
      return this.createPrivateSubnet(subnetProps);
    });
    this.dbSubnets = this.dbSubnetPropsList.map((subnetProps) => {
      return this.createPrivateSubnet(subnetProps);
    });
    this.bastionSubnet = this.createPublicSubnet(this.bastionSubnetProps);
    this.endpointSubnets = this.endpointSubnetPropsList.map((subnetProps) => {
      return this.createPublicSubnet(subnetProps);
    });
  };

  private readonly createPublicSubnet = (
    subnetProps: SubnetProps
  ): ec2.PublicSubnet => {
    const convertedProps: ec2.PublicSubnetProps = {
      vpcId: this.vpc.vpcId,
      availabilityZone: subnetProps.availabilityZone,
      cidrBlock: subnetProps.cidrBlock,
    };
    const subnetName = `${this.appId}-${subnetProps.nameSuffix}`;
    const subnet = new ec2.PublicSubnet(this.scope, subnetName, convertedProps);
    return subnet;
  };

  private readonly createPrivateSubnet = (
    subnetProps: SubnetProps
  ): ec2.PrivateSubnet => {
    const convertedProps: ec2.PrivateSubnetProps = {
      vpcId: this.vpc.vpcId,
      availabilityZone: subnetProps.availabilityZone,
      cidrBlock: subnetProps.cidrBlock,
    };
    const subnetName = `${this.appId}-${subnetProps.nameSuffix}`;
    const subnet = new ec2.PrivateSubnet(
      this.scope,
      subnetName,
      convertedProps
    );
    return subnet;
  };

  private readonly manageInternetGateway = (): void => {
    this.createInternetGateway();
    this.attachInternetGateway();
    this.addRouteToInternetGateway();
  };

  private readonly createInternetGateway = (): void => {
    const internetGatewayId = `${this.appId}-vpc-igw`;
    this.internetGateway = new ec2.CfnInternetGateway(
      this.scope,
      internetGatewayId,
      {
        tags: [
          { key: "attrInternetGatewayId", value: internetGatewayId },
          { key: "logicalId", value: internetGatewayId },
        ],
      }
    );
  };

  private readonly attachInternetGateway = (): void => {
    new ec2.CfnVPCGatewayAttachment(this.scope, "internet-gateway-attachment", {
      vpcId: this.vpc.vpcId,
      internetGatewayId: this.internetGateway.ref,
    });
  };

  private readonly addRouteToInternetGateway = (): void => {
    this.bastionSubnet.addRoute("internet-gateway-route", {
      routerType: ec2.RouterType.GATEWAY,
      routerId: this.internetGateway.ref,
    });
    this.endpointSubnets.forEach((endpointSubnet) => {
      endpointSubnet.addRoute("internet-gateway-route", {
        routerType: ec2.RouterType.GATEWAY,
        routerId: this.internetGateway.ref,
      });
    });
  };

  private readonly createSecurityGroups = (): void => {
    this.lambdaSecurityGroup = this.createSecurityGroup("lambda-sg");
    this.dbSecurityGroup = this.createSecurityGroup("db-sg");
    this.bastionSecurityGroup = this.createSecurityGroup("bastion-sg");
    this.endpointSecurityGroup = this.createSecurityGroup("endpoint-sg", true);
  };

  private readonly createSecurityGroup = (
    securityGroupNameSuffix: string,
    allowAllOutbound: boolean = false
  ): ec2.SecurityGroup => {
    const securityGroupId = `${this.appId}-${securityGroupNameSuffix}`;
    const securityGroup = new ec2.SecurityGroup(this.scope, securityGroupId, {
      vpc: this.vpc,
      securityGroupName: securityGroupId,
      allowAllOutbound,
    });
    return securityGroup;
  };

  private readonly createSecurityGroupIngresses = (): void => {
    this.createSecurityGroupIngress(
      "lambda-db-ingress",
      this.lambdaSecurityGroup,
      this.dbSecurityGroup,
      IP_PROTOCOL,
      DB_PORT
    );
    this.createSecurityGroupIngress(
      "bastion-db-ingress",
      this.bastionSecurityGroup,
      this.dbSecurityGroup,
      IP_PROTOCOL,
      DB_PORT
    );
    this.createSecurityGroupIngress(
      "lambda-endpoint-ingress",
      this.lambdaSecurityGroup,
      this.endpointSecurityGroup,
      IP_PROTOCOL,
      HTTPS_PORT
    );
  };

  private readonly createSecurityGroupIngress = (
    id: string,
    sourceSecurityGroup: ec2.SecurityGroup,
    destinationSecurityGroup: ec2.SecurityGroup,
    ipProtocol: string,
    port: number
  ): void => {
    new ec2.CfnSecurityGroupIngress(this.scope, id, {
      ipProtocol,
      groupId: destinationSecurityGroup.securityGroupId,
      sourceSecurityGroupId: sourceSecurityGroup.securityGroupId,
      fromPort: port,
      toPort: port,
    });
  };

  private readonly createSecurityGroupEgresses = (): void => {
    this.createSecurityGroupEgress(
      "lambda-db-eggress",
      this.lambdaSecurityGroup,
      this.dbSecurityGroup,
      IP_PROTOCOL,
      DB_PORT
    );
    this.createSecurityGroupEgress(
      "bastion-db-eggress",
      this.bastionSecurityGroup,
      this.dbSecurityGroup,
      IP_PROTOCOL,
      DB_PORT
    );
    this.createSecurityGroupEgress(
      "lambda-endpoint-eggress",
      this.lambdaSecurityGroup,
      this.endpointSecurityGroup,
      IP_PROTOCOL,
      HTTPS_PORT
    );
    this.bastionSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(HTTP_PORT)
    );
    this.bastionSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(HTTPS_PORT)
    );
  };

  private readonly createSecurityGroupEgress = (
    id: string,
    sourceSecurityGroup: ec2.SecurityGroup,
    destinationSecurityGroup: ec2.SecurityGroup,
    ipProtocol: string,
    port: number
  ): void => {
    new ec2.CfnSecurityGroupEgress(this.scope, id, {
      ipProtocol,
      groupId: sourceSecurityGroup.securityGroupId,
      destinationSecurityGroupId: destinationSecurityGroup.securityGroupId,
      fromPort: port,
      toPort: port,
    });
  };

  private readonly createEndpoint = (): void => {
    new ec2.InterfaceVpcEndpoint(
      this.scope,
      `${this.appId}-secretsmanager-endpoint`,
      {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: {
          subnets: this.endpointSubnets,
        },
        securityGroups: [this.endpointSecurityGroup],
        open: true,
      }
    );
  };
}
