import {
  AccountRootPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Construct} from "constructs"

/**
 * Policy to restrict access to a single Cloudfront Distribution for S3 bucket KMS Keys

 */

export interface PolicyProps {
  cloudfrontDistributionId: string
}

export class AllowCloudfrontKmsKeyAccessPolicy extends Construct{
  public readonly policyJson

  public constructor(scope: Construct, id: string, props: PolicyProps){
    super(scope, id)

    const accountRootPrincipal = new AccountRootPrincipal()

    const policy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [accountRootPrincipal],
          actions: ["kms:*"],
          resources: ["*"]
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
          actions: [
            "kms:Decrypt",
            "kms:Encrypt",
            "kms:GenerateDataKey*"
          ],
          resources:["*"],
          conditions: {
            StringEquals: {
              "AWS:SourceArn": `arn:aws:cloudfront::${accountRootPrincipal.accountId}:distribution/${props.cloudfrontDistributionId}` // eslint-disable-line max-len
            }
          }
        })
      ]
    })
    this.policyJson = policy.toJSON()
  }
}
