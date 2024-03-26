import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { VpcWrapper } from "./VpcWrapper";
import { WrapperBase, WrapperBaseProps } from "./WrapperBase";

interface Props extends WrapperBaseProps {
  vpcWrapper: VpcWrapper;
  dbName: string;
  readerNum: number;
  minAcu: number;
  maxAcu: number;
}

export class DBWrapper extends WrapperBase {
  public clusterId: string;
  private vpcWrapper: VpcWrapper;
  private readerNum: number;
  private minAcu: number;
  private maxAcu: number;
  public dbName: string;
  public cluster: rds.DatabaseCluster;

  constructor(props: Props) {
    super(props);
    this.initialize(props);
  }

  private readonly initialize = (props: Props): void => {
    this.setAdditionalValues(props);
    this.createCluster();
  };

  private readonly setAdditionalValues = (props: Props): void => {
    const { appId, vpcWrapper, dbName, readerNum, minAcu, maxAcu } = props;

    this.clusterId = `${appId}-db`;
    this.vpcWrapper = vpcWrapper;
    this.dbName = dbName;
    this.readerNum = readerNum;
    this.minAcu = minAcu;
    this.maxAcu = maxAcu;
  };

  private readonly createCluster = (): void => {
    const charSet = "utf8mb4";
    const instanceProps = {
      autoMinorVersionUpgrade: true,
      enablePerformanceInsights: true,
      caCertificate: rds.CaCertificate.RDS_CA_ECC384_G1,
    };
    const readers: rds.IClusterInstance[] = [];
    for (let index = 0; index < this.readerNum; index++) {
      const id = `reader${(index + 1).toString().padStart(2, "0")}`;
      const reader = rds.ClusterInstance.serverlessV2(id, {
        ...instanceProps,
        scaleWithWriter: true,
      });
      readers.push(reader);
    }
    this.cluster = new rds.DatabaseCluster(this.scope, this.clusterId, {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_03_0,
      }),
      vpc: this.vpcWrapper.vpc,
      vpcSubnets: {
        subnets: this.vpcWrapper.dbSubnets,
      },
      securityGroups: [this.vpcWrapper.dbSecurityGroup],
      writer: rds.ClusterInstance.serverlessV2("writer", instanceProps),
      readers,
      deletionProtection: true,
      clusterIdentifier: this.clusterId,
      cloudwatchLogsExports: ["slowquery", "error", "audit"],
      defaultDatabaseName: this.dbName,
      credentials: {
        username: "admin",
        secretName: `${this.clusterId}-admin-secret`,
      },
      storageEncrypted: true,
      monitoringInterval: cdk.Duration.seconds(60),
      serverlessV2MinCapacity: this.minAcu,
      serverlessV2MaxCapacity: this.maxAcu,
      parameters: {
        time_zone: "Asia/Tokyo",
        character_set_client: charSet,
        character_set_connection: charSet,
        character_set_database: charSet,
        character_set_results: charSet,
        character_set_server: charSet,
        innodb_file_per_table: "1",
        "skip-character-set-client-handshake": "1",
        init_connect: `SET NAMES ${charSet}`,
      },
    });
  };
}
