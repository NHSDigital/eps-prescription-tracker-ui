import {Construct} from "constructs"
import {Key, IKey} from "aws-cdk-lib/aws-kms"
import {Secret, ISecret} from "aws-cdk-lib/aws-secretsmanager"
import {
  ManagedPolicy,
  PolicyStatement,
  Effect,
  IRole,
  PolicyDocument,
  AccountRootPrincipal
} from "aws-cdk-lib/aws-iam"
import {SecretValue, RemovalPolicy} from "aws-cdk-lib"

export interface SharedSecretsProps {
  readonly stackName: string
  readonly deploymentRole: IRole
  readonly useMockOidc?: boolean
}

export class SharedSecrets extends Construct {
  public readonly jwtKmsKey: IKey
  public readonly primaryJwtPrivateKey: ISecret
  public readonly mockJwtPrivateKey: ISecret
  public readonly useJwtKmsKeyPolicy: ManagedPolicy

  constructor(scope: Construct, id: string, props: SharedSecretsProps) {
    super(scope, id)

    // Create KMS Key
    this.jwtKmsKey = new Key(this, "JwtKmsKey", {
      description: `${props.stackName}-jwtKmsKey`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
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

    // Policy for using KMS Key
    this.useJwtKmsKeyPolicy = new ManagedPolicy(this, "UseJwtKmsKeyPolicy", {
      description: "Policy to allow using the JWT KMS key",
      statements: [
        new PolicyStatement({
          actions: ["kms:DescribeKey", "kms:Decrypt"],
          effect: Effect.ALLOW,
          resources: [this.jwtKmsKey.keyArn]
        })
      ]
    })

    // Primary JWT Secret
    const primarySecretName = `${props.stackName}-primaryJwtPrivateKey`
    let primaryJwtSecret: ISecret
    try {
      primaryJwtSecret = Secret.fromSecretNameV2(this, "ExistingPrimaryJwtSecret", primarySecretName)
    } catch {
      primaryJwtSecret = new Secret(this, "PrimaryJwtPrivateKey", {
        secretName: primarySecretName,
        secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
        encryptionKey: this.jwtKmsKey
      })
    }
    this.primaryJwtPrivateKey = primaryJwtSecret;

    // Add policy for the primary secret
    (this.primaryJwtPrivateKey as Secret).addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [props.deploymentRole],
        actions: ["secretsmanager:PutSecretValue"],
        resources: ["*"]
      })
    )

    // Mock JWT Secret (if needed)
    if (props.useMockOidc) {
      const mockSecretName = `${props.stackName}-mockJwtPrivateKey`
      let mockJwtSecret: ISecret
      try {
        mockJwtSecret = Secret.fromSecretNameV2(this, "ExistingMockJwtSecret", mockSecretName)
      } catch {
        mockJwtSecret = new Secret(this, "MockJwtPrivateKey", {
          secretName: mockSecretName,
          secretStringValue: SecretValue.unsafePlainText("mock-secret"),
          encryptionKey: this.jwtKmsKey
        })
      }
      this.mockJwtPrivateKey = mockJwtSecret;

      // Add policy for the mock secret
      (this.mockJwtPrivateKey as Secret).addToResourcePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [props.deploymentRole],
          actions: ["secretsmanager:PutSecretValue"],
          resources: ["*"]
        })
      )
    }
  }
}
