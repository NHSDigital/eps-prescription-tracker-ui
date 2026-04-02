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
import {
  SecretValue,
  RemovalPolicy,
  Duration,
  CfnParameter
} from "aws-cdk-lib"

// Interface defining the properties for SharedSecrets construct
export interface SharedSecretsProps {
  readonly stackName: string
  readonly deploymentRole: IRole
  readonly useMockOidc?: boolean
  readonly apigeeApiKey: CfnParameter
  readonly apigeeSecretKey: CfnParameter
  readonly apigeeDoHSApiKey: CfnParameter
  readonly jwtPrivateKey: CfnParameter
}

// Construct for managing shared secrets and associated resources
export class SharedSecrets extends Construct {
  public readonly jwtKmsKey: IKey
  public readonly primaryJwtPrivateKey: Secret
  public readonly mockJwtPrivateKey: Secret
  public readonly useJwtKmsKeyPolicy: ManagedPolicy
  public readonly getPrimaryJwtPrivateKeyPolicy: ManagedPolicy
  public readonly getMockJwtPrivateKeyPolicy: ManagedPolicy
  public readonly apigeeSecretsKmsKey: IKey
  public readonly apigeeApiKey: Secret
  public readonly apigeeSecretKey: Secret
  public readonly apigeeDoHSApiKey: Secret
  public readonly getApigeeSecretsPolicy: ManagedPolicy

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

    this.apigeeSecretsKmsKey = new Key(this, "ApigeeSecretsKmsKey", {
      description: `${props.stackName}-apigeeSecretsKmsKey`,
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

    this.apigeeApiKey = new Secret(this, "ApigeeApiKeySecret", {
      secretName: `${props.stackName}-apigeeApiKey`,
      secretStringValue: SecretValue.cfnParameter(props.apigeeApiKey),
      encryptionKey: this.apigeeSecretsKmsKey
    })
    this.apigeeSecretKey = new Secret(this, "ApigeeSecretKeySecret", {
      secretName: `${props.stackName}-apigeeSecretKey`,
      secretStringValue: SecretValue.cfnParameter(props.apigeeSecretKey),
      encryptionKey: this.apigeeSecretsKmsKey
    })
    this.apigeeDoHSApiKey = new Secret(this, "ApigeeDoHSApiKeySecret", {
      secretName: `${props.stackName}-apigeeDoHSApiKey`,
      secretStringValue: SecretValue.cfnParameter(props.apigeeDoHSApiKey),
      encryptionKey: this.apigeeSecretsKmsKey
    })

    // Create a managed policy to allow getting the primary JWT private key secret
    this.getApigeeSecretsPolicy = new ManagedPolicy(this, "GetApigeeSecretsPolicy", {
      statements: [
        new PolicyStatement({
          actions: ["secretsmanager:GetSecretValue"],
          resources: [
            this.apigeeApiKey.secretArn,
            this.apigeeSecretKey.secretArn,
            this.apigeeDoHSApiKey.secretArn]
        }),
        new PolicyStatement({
          actions: ["kms:DescribeKey", "kms:Decrypt"],
          effect: Effect.ALLOW,
          resources: [this.apigeeSecretsKmsKey.keyArn]
        })
      ]
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

    // Create the primary JWT private key secret
    this.primaryJwtPrivateKey = new Secret(this, "PrimaryJwtPrivateKey", {
      secretName: `${props.stackName}-primaryJwtPrivateKey`,
      secretStringValue: SecretValue.cfnParameter(props.jwtPrivateKey),
      encryptionKey: this.jwtKmsKey
    })

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
        secretStringValue: SecretValue.cfnParameter(props.jwtPrivateKey),
        encryptionKey: this.jwtKmsKey
      })

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
