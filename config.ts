/// https://appdoc.app/artifact/com.hashicorp/cdktf-provider-aws/5.0.19/com/hashicorp/cdktf/providers/aws/vpc/package-summary.html
export const clusterConfig = {
	// used by the terraform provider to reach the targetted environment
	awsConnection: {
		profile: "manomano-sbx",
		region: "eu-west-3"
	},
	kubernetes: {
		subnets: [ "sub.app.a.sbx.0", "sub.app.b.sbx.1"]
	},
	application:{
		environment: "sbx", //prd, ist, support
		region: ["eu-west-3","eu-west-1"],
		project: "laurentgil",
		type: "infra",	
	}
}