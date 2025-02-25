import {Construct} from "constructs"
import {Key, IKey} from "aws-cdk-lib/aws-kms"
import {Secret} from "aws-cdk-lib/aws-secretsmanager"
import {
  ManagedPolicy,
  PolicyStatement,
  Effect,
  IRole,
  PolicyDocument,
  AccountRootPrincipal
} from "aws-cdk-lib/aws-iam"
import {SecretValue, RemovalPolicy, Duration} from "aws-cdk-lib"

// Interface defining the properties for SharedSecrets construct
export interface SharedSecretsProps {
  readonly stackName: string
  readonly deploymentRole: IRole
  readonly useMockOidc?: boolean
}

// Construct for managing shared secrets and associated resources
export class SharedSecrets extends Construct {
  public readonly jwtKmsKey: IKey
  public readonly primaryJwtPrivateKey: Secret
  public readonly mockJwtPrivateKey: Secret
  public readonly useJwtKmsKeyPolicy: ManagedPolicy
  public readonly getPrimaryJwtPrivateKeyPolicy: ManagedPolicy
  public readonly getMockJwtPrivateKeyPolicy: ManagedPolicy
  public readonly getRandomPasswordPolicy: ManagedPolicy

  constructor(scope: Construct, id: string, props: SharedSecretsProps) {
    super(scope, id)

    // Create a KMS Key to encrypt secrets
    this.jwtKmsKey = new Key(this, "JwtKmsKey", {
      description: `${props.stackName}-jwtKmsKey`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(7),
      policy: new PolicyDocument({
        statements: [
          // Allow full IAM permissions for account root
          new PolicyStatement({
            sid: "EnableIAMUserPermissions",
            effect: Effect.ALLOW,
            actions: ["kms:*"],
            principals: [new AccountRootPrincipal()],
            resources: ["*"]
          }),
          // Allow the deployment role to encrypt and generate data keys
          new PolicyStatement({
            effect: Effect.ALLOW,
            principals: [props.deploymentRole],
            actions: ["kms:Encrypt", "kms:GenerateDataKey*"],
            resources: ["*"]
          })
        ]
      })
    })

    // Create a managed policy to allow using the KMS key for decryption
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

    this.getRandomPasswordPolicy = new ManagedPolicy(this, "GetRandomPasswordPolicy", {
      description: "Policy to allow the login proxy lambdas to generate their random data",
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["secretsmanager:GetRandomPassword"],
          resources: ["*"]
        })
      ]
    })

    // Create the primary JWT private key secret
    this.primaryJwtPrivateKey = new Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName}-primaryJwtPrivateKey`,
      secretStringValue: SecretValue.unsafePlainText("ChangeMe"),
      encryptionKey: this.jwtKmsKey
    })

    // Add a policy to allow the deployment role to update the secret
    this.primaryJwtPrivateKey.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [props.deploymentRole],
        actions: ["secretsmanager:PutSecretValue"],
        resources: ["*"]
      })
    )

    // Create a managed policy to allow getting the primary JWT private key secret
    this.getPrimaryJwtPrivateKeyPolicy = new ManagedPolicy(this, "GetPrimaryJwtPrivateKeyPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["secretsmanager:GetSecretValue"],
          resources: [this.primaryJwtPrivateKey.secretArn]
        })
      ]
    })

    // Conditionally create mock JWT private key secret and its policies
    if (props.useMockOidc) {
      this.mockJwtPrivateKey = new Secret(this, "MockJwtPrivateKey", {
        secretName: `${props.stackName}-mockJwtPrivateKey`,
        secretStringValue: SecretValue.unsafePlainText("mock-secret"),
        encryptionKey: this.jwtKmsKey
      })

      // Add a policy to allow the deployment role to update the mock secret
      this.mockJwtPrivateKey.addToResourcePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [props.deploymentRole],
          actions: ["secretsmanager:PutSecretValue"],
          resources: ["*"]
        })
      )

      // Create a managed policy to allow getting the mock JWT private key secret
      this.getMockJwtPrivateKeyPolicy = new ManagedPolicy(this, "GetMockJwtPrivateKeyPolicy", {
        statements: [
          new PolicyStatement({
            actions: ["secretsmanager:GetSecretValue"],
            resources: [this.mockJwtPrivateKey.secretArn]
          })
        ]
      })

    }
  }
}
