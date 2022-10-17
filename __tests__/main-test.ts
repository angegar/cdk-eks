import "cdktf/lib/testing/adapters/jest"; // Load types for expect matchers
import { Testing } from "cdktf";
import * as aws from '@cdktf/provider-aws';

import { EksInfraGlobalStack } from '../main'


describe("My CDKTF Application", () => {

  // // All Unit testst test the synthesised terraform code, it does not create real-world resources
  describe("Global stack Unit testing using assertions", () => {
    it("should contain a role", () => {
      const app = Testing.app();
      const stack = new EksInfraGlobalStack(app, "stack", {
        environment: 'env',
        project: 'test',
        region: 'eu-west-3',
        type: 'infra'
      });

      expect(Testing.synth(stack)).toHaveResource(aws.iam.IamRole);
    });

    it("should contain a role with props", () => {
      const app = Testing.app();
      const stack = new EksInfraGlobalStack(app, "stack", {
        environment: 'env',
        project: 'test',
        region: 'eu-west-3',
        type: 'infra'
      });

      expect(Testing.synth(stack)).toHaveResourceWithProperties(aws.iam.IamRole, { name: "role-eks-cluster" });

    });
  });

  describe("Unit testing using snapshots", () => {
    it("should be valid", () => {
      const app = Testing.app();
      const stack = new EksInfraGlobalStack(app, "stack", {
        environment: 'env',
        project: 'test',
        region: 'eu-west-3',
        type: 'infra'
      });

      expect(Testing.synth(stack)).toMatchSnapshot();
    });
  });

});
