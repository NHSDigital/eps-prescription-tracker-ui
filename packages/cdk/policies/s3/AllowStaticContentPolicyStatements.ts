import {
  AccountRootPrincipal,
  Effect,
  IRole,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Bucket} from "aws-cdk-lib/aws-s3"

/**
 * Policies to allow access to the S3 bucket
 * for deployment role, rum app, cloudfront
 * This does not extend construct as it just defines policy statements
 * it does not create them
 */

export interface PolicyProps {
  bucket: Bucket
  cloudfrontDistributionId: string
  rumAppName: string
  deploymentRole: IRole
  region: string
}

export class AllowStaticContentPolicyStatements {
  public readonly cloudfrontAccessPolicyStatement: PolicyStatement
  public readonly rumAccessPolicyStatement: PolicyStatement
  public readonly deploymentRoleAccessPolicyStatement: PolicyStatement

  public constructor(props: PolicyProps){

    const accountRootPrincipal = new AccountRootPrincipal()
    const cloudfrontAccessPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
      actions: ["s3:GetObject"],
      resources: [props.bucket.arnForObjects("*")],
      conditions: {
        StringEquals: {
          "AWS:SourceArn": `arn:aws:cloudfront::${accountRootPrincipal.accountId}:distribution/${props.cloudfrontDistributionId}` // eslint-disable-line max-len
        }
      }
    })

    const rumAccessPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal("rum.amazonaws.com")],
      actions: [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      resources: [
        props.bucket.bucketArn,
        props.bucket.arnForObjects("*")
      ],
      conditions: {
        StringEquals: {
          "AWS:SourceAccount": accountRootPrincipal.accountId,
          "AWS:SourceArn": `arn:aws:rum:${props.region}:${accountRootPrincipal.accountId}:appmonitor/${props.rumAppName}` // eslint-disable-line max-len
        }
      }
    })

    const deploymentRoleAccessPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      principals: [props.deploymentRole],
      actions: [
        "s3:Abort*",
        "s3:DeleteObject*",
        "s3:GetBucket*",
        "s3:GetObject*",
        "s3:List*",
        "s3:PutObject",
        "s3:PutObjectLegalHold",
        "s3:PutObjectRetention",
        "s3:PutObjectTagging",
        "s3:PutObjectVersionTagging"
      ],
      resources: [
        props.bucket.bucketArn,
        props.bucket.arnForObjects("*")
      ]
    })
    this.cloudfrontAccessPolicyStatement = cloudfrontAccessPolicyStatement
    this.rumAccessPolicyStatement = rumAccessPolicyStatement
    this.deploymentRoleAccessPolicyStatement = deploymentRoleAccessPolicyStatement
  }
}
