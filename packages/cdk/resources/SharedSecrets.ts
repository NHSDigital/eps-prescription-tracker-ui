import {Construct} from "constructs"
import {Key} from "aws-cdk-lib/aws-kms"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {
  AccountRootPrincipal,
  Effect,
  IRole,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement
} from "aws-cdk-lib/aws-iam"
import {SecretValue, Duration, RemovalPolicy} from "aws-cdk-lib"
import {LambdaFunction} from "./LambdaFunction"

export interface SharedSecretsProps {
  readonly stackName: string
  readonly deploymentRole: IRole
  readonly useMockOidc?: boolean
}

export class SharedSecrets extends Construct {
  public readonly jwtKmsKey: Key
  public readonly primaryJwtPrivateKey: Secret
  public readonly mockJwtPrivateKey: Secret
  public readonly useJwtKmsKeyPolicy: ManagedPolicy

  constructor(scope: Construct, id: string, props: SharedSecretsProps) {
    super(scope, id)

    // Create the KMS Key with rotation enabled
    this.jwtKmsKey = new Key(this, "JwtKmsKey", {
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      alias: `alias/${props.stackName}-jwtKmsKey`,
      description: `${props.stackName}-jwtKmsKey`,
      enableKeyRotation: true,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: "EnableIAMUserPermissions",
            effect: Effect.ALLOW,
            actions: ["kms:*"],
            principals: [new AccountRootPrincipal()],
            resources: ["*"]
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [props.deploymentRole],
            actions: ["kms:Encrypt", "kms:GenerateDataKey*"],
            resources: ["*"]
          })
        ]
      })
    })

    // Create the ManagedPolicy for using the KMS key
    this.useJwtKmsKeyPolicy = new ManagedPolicy(this, "UseJwtKmsKeyPolicy", {
      description: "Policy to allow using the JWT KMS key",
      statements: [
        new PolicyStatement({
          actions: ["kms:DescribeKey", "kms:Decrypt"],
          resources: [this.jwtKmsKey.keyArn]
        })
      ]
    })

    // Create the primary JWT private key
    this.primaryJwtPrivateKey = new Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName}-primaryJwtPrivateKey`,
      secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
      encryptionKey: this.jwtKmsKey
    })

    // Add rotation for the primary key using a custom rotation Lambda
    this.primaryJwtPrivateKey.addRotationSchedule("PrimaryKeyRotationSchedule", {
      rotationLambda: new LambdaFunction(this, "PrimaryKeyRotationLambda", {
        serviceName: props.stackName,
        stackName: props.stackName,
        lambdaName: `${props.stackName}-rotation`,
        additionalPolicies: [this.useJwtKmsKeyPolicy],
        logRetentionInDays: 30,
        packageBasePath: "packages/cdk",
        entryPoint: "resources/LambdaFunction/rotationHandler.ts",
        lambdaEnvironmentVariables: {
          SECRET_ID: this.primaryJwtPrivateKey.secretArn,
          KMS_KEY_ARN: this.jwtKmsKey.keyArn
        }
      }).lambda,
      automaticallyAfter: Duration.days(30)
    })

    // Optionally create the mock JWT private key
    if (props.useMockOidc) {
      this.mockJwtPrivateKey = new Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName}-mockJwtPrivateKey`,
        secretStringValue: SecretValue.unsafePlainText("mock-secret"),
        encryptionKey: this.jwtKmsKey
      })

      // Add rotation for the mock key using a custom rotation Lambda
      this.mockJwtPrivateKey.addRotationSchedule("MockKeyRotationSchedule", {
        rotationLambda: new LambdaFunction(this, "MockKeyRotationLambda", {
          serviceName: props.stackName,
          stackName: props.stackName,
          lambdaName: `${props.stackName}-mRotation`,
          additionalPolicies: [this.useJwtKmsKeyPolicy],
          logRetentionInDays: 30,
          packageBasePath: "packages/cdk",
          entryPoint: "resources/LambdaFunction/rotationHandler.ts",
          lambdaEnvironmentVariables: {
            SECRET_ID: this.mockJwtPrivateKey.secretArn,
            KMS_KEY_ARN: this.jwtKmsKey.keyArn
          }
        }).lambda,
        automaticallyAfter: Duration.days(30)
      })
    }
  }
}
