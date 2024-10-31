import {
  AccountRootPrincipal,
  Effect,
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
}

export class AllowCloudfrontGetObjectPolicyStatement extends Construct{
  public readonly policyStatement: PolicyStatement

  public constructor(scope: Construct, id: string, props: PolicyProps){
    super(scope, id)

    const accountRootPrincipal = new AccountRootPrincipal()
    const policyStatement = new PolicyStatement({
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

    this.policyStatement = policyStatement
  }
}
