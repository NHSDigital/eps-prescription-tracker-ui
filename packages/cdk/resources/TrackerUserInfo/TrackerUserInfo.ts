import {Construct} from "constructs"
import {LambdaFunction} from "../LambdaFunction"

export interface TrackerUserInfoProps {
  readonly serviceName: string;
  readonly stackName: string;
}

export class TrackerUserInfo extends Construct {
  public readonly lambdaFunction: LambdaFunction

  constructor(scope: Construct, id: string, props: TrackerUserInfoProps) {
    super(scope, id)

    this.lambdaFunction = new LambdaFunction(this, "TrackerUserInfoLambda", {
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaName: "TrackerUserInfo",
      packageBasePath: "packages/cdk/resources/TrackerUserInfo",
      entryPoint: "handler.ts",
      lambdaEnvironmentVariables: {
        // Add any required environment variables here
      }
    })
  }
}
