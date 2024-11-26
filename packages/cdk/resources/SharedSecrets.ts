import {Construct} from "constructs"
import {Key, IKey} from "aws-cdk-lib/aws-kms"
import {Secret, ISecret} from "aws-cdk-lib/aws-secretsmanager"
import {
  ManagedPolicy,
  PolicyStatement,
  Effect,
  IRole
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
      removalPolicy: RemovalPolicy.DESTROY
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
    this.primaryJwtPrivateKey =
      Secret.fromSecretNameV2(this, "ExistingPrimaryJwtSecret", primarySecretName) ||
      new Secret(this, "PrimaryJwtPrivateKey", {
        secretName: primarySecretName,
        secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
        encryptionKey: this.jwtKmsKey
      })

    // Mock JWT Secret (if needed)
    if (props.useMockOidc) {
      const mockSecretName = `${props.stackName}-mockJwtPrivateKey`
      this.mockJwtPrivateKey =
        Secret.fromSecretNameV2(this, "ExistingMockJwtSecret", mockSecretName) ||
        new Secret(this, "MockJwtPrivateKey", {
          secretName: mockSecretName,
          secretStringValue: SecretValue.unsafePlainText("mock-secret"),
          encryptionKey: this.jwtKmsKey
        })
    }
  }
}
