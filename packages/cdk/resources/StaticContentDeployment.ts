import {Fn, RemovalPolicy} from "aws-cdk-lib"
import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {IKey} from "aws-cdk-lib/aws-kms"
import {LogGroup} from "aws-cdk-lib/aws-logs"
import {Bucket, IBucket} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"
import {StaticContentBucket} from "./StaticContentBucket"
import {NagSuppressions} from "cdk-nag"
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment"
import {basename, join, resolve} from "path"
import {execSync} from "child_process"
import {cpSync, globSync} from "fs"
import {Cognito} from "./Cognito"
import {Rum} from "./Rum"
import {LocalBundle} from "./LocalBundle"

export interface StaticContentDeploymentProps {
  readonly account: string
  readonly region: string
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
  readonly commitId: string
  readonly environment: string
  readonly staticContentBucket: StaticContentBucket
  readonly logRetentionInDays: number
  readonly cloudwatchKmsKey: IKey
  readonly cognito: Cognito
  readonly fullCloudfrontDomain: string
  readonly fullCognitoDomain: string
  readonly reactLogLevel: string
  readonly rum: Rum
}

export class StaticContentDeployment extends Construct {
  public readonly deployedBucket: IBucket

  public constructor(scope: Construct, id: string, props: StaticContentDeploymentProps) {
    super(scope, id)

    const logGroup = new LogGroup(this, "LogGroup", {
      encryptionKey: props.cloudwatchKmsKey,
      logGroupName: `/aws/lambda/${props.stackName}-static-content-deployment`,
      retention: props.logRetentionInDays,
      removalPolicy: RemovalPolicy.DESTROY
    })
    const assetBucket = Bucket.fromBucketName(this, "AssetBucket",
      `cdk-hnb659fds-assets-${props.account}-${props.region}`)
    const policy = new ManagedPolicy(this, "Policy", {
      statements: [
        new PolicyStatement({
          actions: [
            "s3:ListBucket",
            "s3:GetObject"
          ],
          resources: [
            assetBucket.bucketArn,
            assetBucket.arnForObjects("*")
          ]
        }),
        new PolicyStatement({
          actions: [
            "s3:ListBucket",
            "s3:DeleteObject",
            "s3:PutObject"
          ],
          resources: [
            props.staticContentBucket.bucket.bucketArn,
            props.staticContentBucket.bucket.arnForObjects(props.version + "/*"),
            props.staticContentBucket.bucket.arnForObjects(`source_maps/${props.commitId}/site/assets/*`)
          ]
        }),
        new PolicyStatement({
          actions: [
            "kms:Decrypt",
            "kms:Encrypt",
            "kms:GenerateDataKey"
          ],
          resources: [
            props.staticContentBucket.kmsKey.keyArn,
            Fn.importValue("CdkBootstrap-hnb659fds-FileAssetKeyArn")
          ]
        }),
        new PolicyStatement({
          actions: [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          resources: [
            logGroup.logGroupArn,
            `${logGroup.logGroupArn}:log-stream:*`
          ]
        })
      ]
    })
    NagSuppressions.addResourceSuppressions(policy, [
      {
        id: "AwsSolutions-IAM5",
        // eslint-disable-next-line max-len
        reason: "Suppress error for not having wildcards in permissions. This is a fine as we need to have permissions on all log streams under path"
      }
    ])
    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [policy]
    }).withoutPolicyUpdates()
    const mainDeployment = new BucketDeployment(this, "MainDeployment", {
      sources: [
        new LocalBundle(this, "MainBuild", {
          bundling: {
            tryBundle(outputDir, options) {
              const root = resolve("../..")
              execSync(
                `npm run compile --workspace packages/cpt-ui`,
                {cwd: root, env: {...process.env, ...options.environment}, stdio: "inherit"}
              )
              cpSync(join(root, "packages", "cpt-ui", "dist"), outputDir, {recursive: true})
              return true
            }
          },
          environment: {
            VITE_userPoolId: props.cognito.userPool.userPoolId,
            VITE_userPoolClientId: props.cognito.userPoolClient.userPoolClientId,
            VITE_hostedLoginDomain: props.fullCognitoDomain,
            VITE_cloudfrontBaseUrl: `https://${props.fullCloudfrontDomain}`,
            VITE_TARGET_ENVIRONMENT: props.environment,
            VITE_COMMIT_ID: props.commitId,
            VITE_VERSION_NUMBER: props.version,
            VITE_RUM_GUEST_ROLE_ARN: props.rum.guestRole.roleArn,
            VITE_RUM_IDENTITY_POOL_ID: props.rum.identityPool.ref,
            VITE_RUM_APPLICATION_ID: props.rum.rumApp.attrId,
            VITE_REACT_LOG_LEVEL: props.reactLogLevel
          }
        }),
        Source.asset("../staticContent", {exclude: ["jwks"]}),
        Source.asset(`../staticContent/jwks/${props.environment}`),
        Source.data("version.txt", props.version)
      ],
      destinationKeyPrefix: props.version,
      destinationBucket: props.staticContentBucket.bucket,
      retainOnDelete: false,
      role: role,
      logGroup: logGroup
    })
    const sourceMapsDeployment = new BucketDeployment(this, "SourceMapsDeployment", {
      sources: [new LocalBundle(this, "IsolatedSourceMaps", {
        bundling: {
          tryBundle(outputDir) {
            for (const file of globSync(join(resolve("../.."), "packages", "cpt-ui", "dist", "**", "*.map"))) {
              cpSync(file, join(outputDir, basename(file)))
            }
            return true
          }
        }
      })],
      destinationKeyPrefix: `source_maps/${props.commitId}/site/assets`,
      // source map bundling must be done after main build as it needs access to the generated source map files
      destinationBucket: mainDeployment.deployedBucket,
      retainOnDelete: false,
      role: role,
      logGroup: logGroup
    })
    this.deployedBucket = sourceMapsDeployment.deployedBucket
  }
}
