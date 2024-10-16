import {
  App,
  Environment,
  Stack,
  StackProps,
  Fn
} from "aws-cdk-lib"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {HttpOrigin, RestApiOrigin, S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {
  Distribution,
  FunctionEventType,
  ViewerProtocolPolicy,
  AllowedMethods,
  AccessLevel,
  OriginRequestPolicy,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  HttpVersion,
  SecurityPolicyProtocol,
  SSLMethod
} from "aws-cdk-lib/aws-cloudfront"
import {Bucket} from "aws-cdk-lib/aws-s3"
import {CfnKey, Key} from "aws-cdk-lib/aws-kms"
import {RestApiBase} from "aws-cdk-lib/aws-apigateway"
import {UserPoolDomain} from "aws-cdk-lib/aws-cognito"

import {AllowCloudfrontKmsKeyAccessPolicy} from "../policies/kms/AllowCloudfrontKmsKeyAccessPolicy"
import {CloudfrontFunction} from "../resources/Cloudfront/CloudfrontFunction"

export interface CloudfrontStackProps extends StackProps {
  readonly env: Environment
  readonly stackName: string
  readonly version: string
  readonly staticContentBucket: Bucket
  staticContentBucketKmsKey: Key
  readonly apiGateway: RestApiBase
  readonly cognitoUserPoolDomain: UserPoolDomain,
  readonly cognitoRegion: string
}

export class CloudfrontStack extends Stack {
  public constructor(scope: App, id: string, props: CloudfrontStackProps) {
    super(scope, id, props)

    // Imports
    const epsHostedZoneId = Fn.importValue("eps-route53-resources:EPS-ZoneID")
    const epsDomainName = Fn.importValue("eps-route53-resources:EPS-domain")

    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "hostedZone", {
      hostedZoneId: epsHostedZoneId,
      zoneName: epsDomainName
    })

    const auditLoggingBucket = Bucket.fromBucketArn(
      this, "AuditLoggingBucket", Fn.importValue("account-resources:AuditLoggingBucket"))

    // Cert
    const cloudfrontCertificate = new Certificate(this, "CloudfrontCertificate", {
      domainName: epsDomainName,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    // Origins
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      props.staticContentBucket,
      {
        originAccessLevels: [AccessLevel.READ]
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(props.apiGateway, {
      customHeaders: {
        "destination-apigw-id": props.apiGateway.restApiId // for later apigw waf stuff
      }
    })

    const cognitoOrigin = new HttpOrigin(
      `${props.cognitoUserPoolDomain.domainName}.auth.${props.cognitoRegion}.amazoncognito.com`)

    // Origin Request Policies
    // Allow all for now, may want to review these at a later stage
    const apiGatewayRequestPolicy = new OriginRequestPolicy(this, "apiGatewayRequestPolicy", {
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.all()
    })

    const cognitoRequestPolicy = new OriginRequestPolicy(this, "cognitoRequestPolicy", {
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.all()
    })

    // Cache Policies
    // todo - to follow in a later ticket

    // Cloudfront Functions
    const s3404UriRewriteFunction = new CloudfrontFunction(this, "S3404UriRewriteFunction", {
      source: "../../cloudfrontFunctions/src/genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "404.html"
        }
      ]
    })

    const s3404ModifyStatusCodeFunction = new CloudfrontFunction(this, "S3404ModifyStatusCodeFunction", {
      source: "../../cloudfrontFunctions/src/s3404ModifyStatusCode.js"
    })

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      source: "../../cloudfrontFunctions/src/s3StaticContentUriRewrite.js",
      keyValues: [
        {
          key: "version",
          value: props.version
        }
      ]
    })

    const apiGatewayStripPathFunction = new CloudfrontFunction(this, "ApiGatewayStripPathFunction", {
      source: "../../cloudfrontFunctions/src/genericStripPathUriRewrite.js",
      keyValues: [
        {
          key: "path",
          value: "/api"
        }
      ]
    })

    const cognitoStripPathFunction = new CloudfrontFunction(this, "CognitoStripPathFunction", {
      source: "../../cloudfrontFunctions/src/genericStripPathUriRewrite.js",
      keyValues: [
        {
          key: "path",
          value: "/auth"
        }
      ]
    })

    const s3JwksUriRewriteFunction = new CloudfrontFunction(this, "s3JwksUriRewriteFunction", {
      source: "../../cloudfrontFunctions/src/genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "jwks.json"
        }
      ]
    })

    // Distribution
    const cloudfrontDistribution = new Distribution(this, "CloudfrontDistribution", {
      domainNames: [epsDomainName],
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
        },
        "/api/*": {
          origin: apiGatewayOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: apiGatewayRequestPolicy,
          functionAssociations: [
            {
              function: apiGatewayStripPathFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/auth/*": {
          origin: cognitoOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: cognitoRequestPolicy,
          functionAssociations: [
            {
              function: cognitoStripPathFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/jwks/": { // matches exactly <url>/jwks and will only serve the jwks json (via cf function)
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3JwksUriRewriteFunction.function,
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
    const contentBucketKmsKey = (props.staticContentBucketKmsKey.node.defaultChild as CfnKey)
    contentBucketKmsKey.keyPolicy = new AllowCloudfrontKmsKeyAccessPolicy(
      this, "StaticContentBucketAllowCloudfrontKmsKeyAccessPolicy", {
        cloudfrontDistributionId: cloudfrontDistribution.distributionId
      })
  }
}
