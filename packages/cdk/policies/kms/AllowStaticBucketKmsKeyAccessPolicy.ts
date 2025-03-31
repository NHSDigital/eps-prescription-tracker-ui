import {
  AccountRootPrincipal,
  Effect,
  IPrincipal,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Construct} from "constructs"

/**
 * Policy to restrict access to a single Cloudfront Distribution for KMS Keys

 */

export interface PolicyProps {
  cloudfrontDistributionId: string
  deploymentRole: IPrincipal
  rumAppName: string
  region: string
}

export class AllowStaticBucketKmsKeyAccessPolicy extends Construct{
  public readonly policyDocument: PolicyDocument

  public constructor(scope: Construct, id: string, props: PolicyProps){
    super(scope, id)

    const accountRootPrincipal = new AccountRootPrincipal()

    const policyDocument = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [accountRootPrincipal],
          actions: ["kms:*"],
          resources: ["*"]
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [props.deploymentRole],
          actions: [
            "kms:Encrypt",
            "kms:GenerateDataKey*"
          ],
          resources:["*"]
        })
      ]
    })

    if (props.rumAppName) {
      policyDocument.addStatements(
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal("rum.amazonaws.com")],
          actions: ["kms:Decrypt"],
          resources:["*"],
          conditions: {
            StringEquals: {
              "AWS:SourceAccount": accountRootPrincipal.accountId,
              "AWS:SourceArn": `arn:aws:rum:${props.region}:${accountRootPrincipal.accountId}/${props.rumAppName}` // eslint-disable-line max-len
            }
          }
        })
      )
    }

    // if we have a cloudfrontDistributionId, then add correct policy
    if(props.cloudfrontDistributionId) {
      policyDocument.addStatements(
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
      )
    }

    // return the policy
    this.policyDocument = policyDocument
  }
}
