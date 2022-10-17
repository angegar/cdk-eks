import { Construct } from "constructs";
import { clusterConfig } from './config'
import { S3Backend } from "cdktf";

// Terraform Provider factory
// Avoid to create one provider per object
export class TerraformBackends {
	private static s3Backend: S3Backend;
	private static bucketName: string = `mm-terraform-remote-states-${clusterConfig.application.region[0]}`
	private static dynamodbTabble: string = 'tf-states-lock-table'
	private static profile: string = "manomano-support"

	private constructor(){}

	public static getS3Backend(scope: Construct): S3Backend {
		let appconfig = clusterConfig.application
		if (!TerraformBackends.s3Backend) {
			TerraformBackends.s3Backend = new S3Backend(scope, {

				bucket: TerraformBackends.bucketName,
				key: `${appconfig.environment}/${appconfig.type}/${appconfig.project}-infra-${appconfig.region[0]}.tfstate`,
				region: appconfig.region[0],
				encrypt: true, 
				dynamodbTable: TerraformBackends.dynamodbTabble,
				profile: TerraformBackends.profile,
			  });
		}

		return TerraformBackends.s3Backend;
	}
}