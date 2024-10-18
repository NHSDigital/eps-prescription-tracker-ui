import {
  App,
  Environment,
  Stack,
  StackProps
} from "aws-cdk-lib"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {
  Distribution,
  FunctionEventType,
  ViewerProtocolPolicy,
  AllowedMethods,
  AccessLevel,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {Bucket} from "aws-cdk-lib/aws-s3"

import {CloudfrontFunction} from "../resources/Cloudfront/CloudfrontFunction"
import {
  AccountRootPrincipal,
  Effect,
  PolicyStatement,
  ServicePrincipal
} from "aws-cdk-lib/aws-iam"
import {Key} from "aws-cdk-lib/aws-kms"

// For if cloudfront and s3 bucket are in different stacks:
// import {
//   AccountRootPrincipal,
//   Effect,
//   PolicyStatement,
//   ServicePrincipal
// } from "aws-cdk-lib/aws-iam"

export interface CloudfrontStackProps extends StackProps {
  readonly env: Environment
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI Cloudfront

 */

export class CloudfrontStack extends Stack {
  public constructor(scope: App, id: string, props: CloudfrontStackProps) {
    super(scope, id, props)

    const epsDomainName = this.node.tryGetContext("epsDomainName")
    const epsHostedZoneId = this.node.tryGetContext("epsHostedZoneId")
    const staticBucketArn = this.node.tryGetContext("staticBucketARn")
    const staticContentBucketKmsKeyArn = this.node.tryGetContext("staticContentBucketKmsKeyArn")
    const auditLoggingBucketImport = this.node.tryGetContext("auditLoggingBucket")

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", auditLoggingBucketImport)

    const staticContentBucket = Bucket.fromBucketArn(
      this, "staticContentBucket", staticBucketArn as string)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const staticContentBucketKmsKey = Key.fromKeyArn(
      this, "staticContentBucketKmsKey", staticContentBucketKmsKeyArn as string
    )

    const targetDomainName = `cf.cpt-ui.${epsDomainName}`
    // Cert

    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: targetDomainName,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    // For if cloudfront and s3 bucket are in different stacks:
    // const staticContentBucket = Bucket.fromBucketArn(
    //   this, "staticContentBucket", Fn.importValue("cpt-ui-shared-resources:StaticContentBucket:Arn"))
    // const staticContentBucketOrigin = S3BucketOrigin.withBucketDefaults(staticContentBucket)

    // Origins
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      staticContentBucket,
      {
        originAccessLevels: [AccessLevel.READ]
      }
    )

    // Cache Policies
    // todo - to follow in a later ticket

    // Cloudfront Functions
    const s3404UriRewriteFunction = new CloudfrontFunction(this, "S3404UriRewriteFunction", {
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "404.html"
        }
      ]
    })

    const s3404ModifyStatusCodeFunction = new CloudfrontFunction(this, "S3404ModifyStatusCodeFunction", {
      sourceFileName: "s3404ModifyStatusCode.js"
    })

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      sourceFileName: "s3StaticContentUriRewrite.js",
      keyValues: [
        {
          key: "version",
          value: props.version
        }
      ]
    })

    // Distribution
    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [targetDomainName],
      certificate: cloudfrontCertificate,
      httpVersion: HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018, // set to 2018 but we may want 2019 or 2021
      sslSupportMethod: SSLMethod.SNI,
      publishAdditionalMetrics: true,
      enableLogging: true,
      logBucket: auditLoggingBucket,
      logFilePrefix: "/cloudfront",
      logIncludesCookies: true, // may actually want to be false, don't know if it includes names of cookies or contents
      defaultBehavior: {
        origin: staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations:[
          {
            function: s3404UriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          },
          {
            function: s3404ModifyStatusCodeFunction.function,
            eventType: FunctionEventType.VIEWER_RESPONSE
          }
        ]
      },
      additionalBehaviors:{
        "/site/*": {
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3StaticContentUriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        }
      }
    })

    // When using an s3 origin with OAC and SSE, cdk will use a wildcard in the generated Key policy condition
    // to match all Distribution IDs in order to avoid a circular dependency between the KMS key,Bucket, and
    // Distribution during the initial deployment. This updates the policy to restrict it to a specific distribution.
    // (This may need to only be added to the stack after initial deployment)
    //const contentBucketKmsKey = (staticContentBucketKmsKey.node.defaultChild as CfnKey)
    //contentBucketKmsKey.keyPolicy = new AllowCloudfrontKmsKeyAccessPolicy(
    //  this, "StaticContentBucketAllowCloudfrontKmsKeyAccessPolicy", {
    //    cloudfrontDistributionId: cloudfrontDistribution.distributionId
    //  }).policyJson

    /* eslint-disable */
    // For if cloudfront and s3 bucket are in different stacks:
    const OACPolicy = new PolicyStatement({
       effect: Effect.ALLOW,
       principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
       actions: ["s3:GetObject"],
       resources: [staticContentBucket.arnForObjects("*")],
       conditions: {
         StringEquals: {
           "AWS:SourceArn": `arn:aws:cloudfront::${new AccountRootPrincipal().accountId}:distribution/${cloudfrontDistribution.distributionId}`  
         }
       }
     })
    staticContentBucket.addToResourcePolicy(OACPolicy)
    /* eslint-enable */
  }
}
