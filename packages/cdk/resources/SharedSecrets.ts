import {Construct} from "constructs"
import {Key, IKey, Alias} from "aws-cdk-lib/aws-kms"
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

export interface SharedSecretsProps {
  readonly stackName: string
  readonly deploymentRole: IRole
  readonly useMockOidc?: boolean
}

export class SharedSecrets extends Construct {
  public readonly jwtKmsKey: IKey
  public readonly primaryJwtPrivateKey: Secret
  public readonly mockJwtPrivateKey: Secret
  public readonly useJwtKmsKeyPolicy: ManagedPolicy

  constructor(scope: Construct, id: string, props: SharedSecretsProps) {
    super(scope, id)

    // Attempt to find an existing KMS key by alias
    const existingAlias = Alias.fromAliasName(
      this,
      "ExistingJwtKmsKeyAlias",
      `alias/${props.stackName}-jwtKmsKey`
    )

    this.jwtKmsKey = existingAlias.aliasTargetKey
      ? existingAlias.aliasTargetKey // Use the existing key (IKey)
      : new Key(this, "JwtKmsKey", {
        alias: `alias/${props.stackName}-jwtKmsKey`,
        description: `${props.stackName}-jwtKmsKey`,
        enableKeyRotation: true,
        removalPolicy: RemovalPolicy.DESTROY,
        pendingWindow: Duration.days(7),
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

    // Create ManagedPolicy for using the KMS key
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

    // Optionally create the mock JWT private key
    if (props.useMockOidc) {
      this.mockJwtPrivateKey = new Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName}-mockJwtPrivateKey`,
        secretStringValue: SecretValue.unsafePlainText("mock-secret"),
        encryptionKey: this.jwtKmsKey
      })
    }
  }
}
