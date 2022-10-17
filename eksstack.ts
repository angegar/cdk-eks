import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import { clusterConfig } from "./config";
import { TerraformProvider } from "./provider";
import { TerraformBackends } from "./backend";
import { IamRole } from "@cdktf/provider-aws/lib/iam";
// import { DataAwsVpc } from "@cdktf/provider-aws/lib/vpc";

export class EksStack extends TerraformStack {
  private name: string;

  private subnets?: aws.vpc.DataAwsSubnets;

  private podRole?: aws.iam.IamRole;

  private version: string;

  private hostedZone?: aws.route53.Route53Zone;

  private dndRecordCount: number = 0;

  private EKS_ASSUME_ROLE_POLICY = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "eks.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  };

  private PUT_CW_METRICS_POLICY = {
    Version: "2012-10-17",
    Statement: [
      {
        Action: ["cloudwatch:PutMetricData"],
        Resource: "*",
        Effect: "Allow",
      },
    ],
  };

  private EKS_EC2_PODS_EXECUTION_ASSUME_ROLE_POLICY = {
    // arn:aws:sts::504566391182:assumed-role/role-pods-laurentgil/i-0f66c5b9851d5ff0b 
    // is not authorized to perform: route53:ListHostedZones because no identity-based policy 
    // allows the route53:ListHostedZones action\n\tstatus code: 403, 
    // request id: 1a5fd441-c756-48f3-a6fd-10384dd41448"
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  };

  private STS_ALLOW_POLICY = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "sts:AssumeRoleWithWebIdentity",
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: "route53:*",
        Resource: "*",
      }
    ],
  };

  constructor(scope: Construct, name: string, version: string = "1.22") {
    super(scope, name);

    this.name = name;
    this.version = version;

    TerraformProvider.getAwsProvider(this);
    TerraformBackends.getS3Backend(this);

    this.CreateEks();
    this.CreateNodeGroup();
  }

  private CreateEks() {
    new aws.eks.EksCluster(this, "eks-cluster", {
      //   dependsOn: [vpc], // The VPC must exist before the eks cluster creation
      name: this.name,
      roleArn: this.GetEksRole().arn,
      vpcConfig: {
        subnetIds: this.GetSubnetIds().ids,
      },
      enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
        "controllerManager",
        "scheduler",
      ],
      version: this.version,
    });
  }

  private GetSubnetIds(): aws.vpc.DataAwsSubnets {
    if (!this.subnets) {
      this.subnets = new aws.vpc.DataAwsSubnets(this, "subnets", {
        filter: [
          {
            name: "tag:Name",
            values: clusterConfig.kubernetes.subnets,
          },
        ],
      });
    }

    return this.subnets;
  }

  private GetEksRole(): IamRole {
    return new aws.iam.IamRole(this, "eks-cluster-role", {
      name: `role-eks-cluster-${clusterConfig.application.project}`,
      assumeRolePolicy: JSON.stringify(this.EKS_ASSUME_ROLE_POLICY),
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
        "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
      ],
      inlinePolicy: [
        {
          name: "AmazonEKSClusterCloudWatchMetricsPolicy",
          policy: JSON.stringify(this.PUT_CW_METRICS_POLICY),
        },
      ],
    });
  }

  private GetPodRole(): aws.iam.IamRole {
    if (!this.podRole) {
      this.podRole = new aws.iam.IamRole(this, "ec2-pods-execution-role", {
        name: `role-pods-${clusterConfig.application.project}`,
        assumeRolePolicy: JSON.stringify(
          this.EKS_EC2_PODS_EXECUTION_ASSUME_ROLE_POLICY
        ),
        managedPolicyArns: [
          "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
          "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
          "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
          "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
          "arn:aws:iam::aws:policy/AmazonRoute53DomainsFullAccess"
        ],
        inlinePolicy: [
          {
            name: "STSAllowPolicy",
            policy: JSON.stringify(this.STS_ALLOW_POLICY),
          },
        ],
      });
    }
    return this.podRole;
  }

  public CreateNodeGroup(
    name: string = "default",
    nbNodes: number = 3,
    instanceTypes: string[] = ["m6g.xlarge"],
    archType: string = "arm",
    taint?: aws.eks.EksNodeGroupTaint[]
  ) {
    let amiType: string = "BOTTLEROCKET_ARM_64";

    if (archType == "arm") {
      amiType = "BOTTLEROCKET_ARM_64";
    } else {
      amiType = "BOTTLEROCKET_x86_64";
      taint = [
        {
          key: "arch",
          value: "amd64",
          effect: "NO_SCHEDULE",
        },
      ];
    }
    //beta.kubernetes.io/arch	arm64
    new aws.eks.EksNodeGroup(this, `cluster-node-group-${name}`, {
      clusterName: this.name,
      nodeRoleArn: this.GetPodRole().arn,
      nodeGroupName: `${this.name}-${name}`,
      subnetIds: this.GetSubnetIds().ids,
      scalingConfig: {
        desiredSize: nbNodes,
        maxSize: 3,
        minSize: 1,
      },
      instanceTypes: instanceTypes,
      amiType: amiType,
      taint: taint,
      capacityType: "ON_DEMAND",
      version: this.version,
      diskSize: 20
    });
  }

  public CreateHostedZone(name: string):aws.route53.Route53Zone {
    if (! this.hostedZone) {
      this.hostedZone = new aws.route53.Route53Zone(this, name,{
      name: name,
      comment: "Hosted zone owned by the platform experts for their demo environment",
    })

    this.CreateCertificate(name)
  }

   return this.hostedZone

  }

  private CreateCertificate(domaineName: string) {
    let cert = new aws.acm.AcmCertificate(this,`${domaineName}-cert`,{
      validationMethod: "DNS",
      domainName: `*.${domaineName}`,
    })

    // Create the auto validation record
    let rec = this.AddDNSRecord(
      cert.domainValidationOptions.get(0).resourceRecordName,
      cert.domainValidationOptions.get(0).resourceRecordValue,
      cert.domainValidationOptions.get(0).resourceRecordType
    )

    new aws.acm.AcmCertificateValidation(this,`${domaineName}-validation`,{
      certificateArn: cert.arn,
      validationRecordFqdns: [rec.fqdn]
    })

  }

  private AddDNSRecord(name: string, value: string, type: string):aws.route53.Route53Record{

    return new aws.route53.Route53Record (this,`dns-record-${this.dndRecordCount.toString()}`, {
      name: name,
      records: [value],
      type: type,
      zoneId: this.hostedZone!.id,
      ttl: 60
    })
  }
}
