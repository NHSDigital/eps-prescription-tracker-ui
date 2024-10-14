import {
  AccountRootPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Construct} from "constructs"

export interface AllowCloudfrontKmsKeyAccessPolicyProps {
  cloudfrontDistributionId: string
}

export class AllowCloudfrontKmsKeyAccessPolicy extends Construct{
  public constructor(scope: Construct, id: string, props: AllowCloudfrontKmsKeyAccessPolicyProps){
    super(scope, id)

    const accountRootPrincipal = new AccountRootPrincipal()

    new PolicyDocument({
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
  }
}
