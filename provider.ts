import { Construct } from "constructs";
// import { App, DataTerraformRemoteStateS3, Fn, S3Backend, TerraformStack } from "cdktf";
import * as aws from '@cdktf/provider-aws';
import { clusterConfig } from './config'

// Terraform Provider factory
// Avoid to create one provider per object
export class TerraformProvider {
	private static awsProvider: aws.AwsProvider;

	private constructor(){}

	public static getAwsProvider(scope: Construct): aws.AwsProvider {
		if (!TerraformProvider.awsProvider) {
			TerraformProvider.awsProvider = new aws.AwsProvider(scope, "aws",{
				region: clusterConfig.awsConnection.region,
				profile: clusterConfig.awsConnection.profile,
			});
		}

		return TerraformProvider.awsProvider;
	}
}