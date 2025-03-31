import {
  AccountRootPrincipal,
  Effect,
  IRole,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {Construct} from "constructs"

/**
 * Policy to allow cloudfront to get objects from a S3 bucket

 */

export interface PolicyProps {
  bucket: Bucket
  cloudfrontDistributionId: string
  rumAppName: string
  deploymentRole: IRole
}

export class AllowStaticContentPolicyStatements extends Construct{
  public readonly cloudfrontAccessPolicyStatement: PolicyStatement
  public readonly rumAllowReadObject: PolicyStatement
  public readonly bucketAllowDeployUploadPolicyStatement: PolicyStatement

  public constructor(scope: Construct, id: string, props: PolicyProps){
    super(scope, id)

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

    const rumAllowReadObject = new PolicyStatement({
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
          "AWS:SourceArn": `arn:aws:cloudfront::${accountRootPrincipal.accountId}:appmonitor/${props.rumAppName}` // eslint-disable-line max-len
        }
      }
    })

    const bucketAllowDeployUploadPolicyStatement = new PolicyStatement({
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
    this.rumAllowReadObject = rumAllowReadObject
    this.bucketAllowDeployUploadPolicyStatement = bucketAllowDeployUploadPolicyStatement
  }
}
