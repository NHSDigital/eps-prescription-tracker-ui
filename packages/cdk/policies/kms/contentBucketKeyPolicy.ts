import {
  AccountRootPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"

const accountRootPrincipal = new AccountRootPrincipal()

export const contentBucketKmsKeyPolicy = (cloudfrontDistributionId: string) => {
  return new PolicyDocument({
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
            "AWS:SourceArn": `arn:aws:cloudfront::${accountRootPrincipal.accountId}:distribution/${cloudfrontDistributionId}` // eslint-disable-line max-len
          }
        }
      })
    ]
  })
}
