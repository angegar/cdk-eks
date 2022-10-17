// import { Construct } from "constructs";
import { App } from "cdktf";
// import * as aws from '@cdktf/provider-aws';
import { clusterConfig } from './config';
// import { TerraformProvider} from './provider';
import { EksStack } from "./eksstack";

const app = new App();

let clusterName: string = `${clusterConfig.application.environment}-${clusterConfig.application.project}`
let stack1: EksStack =new EksStack(app, clusterName, "1.23")
stack1.CreateNodeGroup(
	"intel",
	1,
	["t3.medium"],
	"x86_64")
	
stack1.CreateHostedZone("pe-demo.manomano.tech")

app.synth();