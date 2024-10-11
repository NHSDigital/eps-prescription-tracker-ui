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
  KeyValueStore,
  ImportSource,
  Function,
  FunctionCode,
  FunctionRuntime,
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
import {Bucket, IBucket} from "aws-cdk-lib/aws-s3"
import {CfnKey, IKey} from "aws-cdk-lib/aws-kms"
import {RestApiBase} from "aws-cdk-lib/aws-apigateway"
import {IUserPoolDomain} from "aws-cdk-lib/aws-cognito"

import {contentBucketKmsKeyPolicy} from "../policies/kms/contentBucketKeyPolicy"
import {readFileSync} from "fs"
import {resolve} from "path"

export interface CloudfrontStackProps extends StackProps {
  readonly env: Environment
  readonly stackName: string
  readonly version: string
  readonly contentBucket: IBucket
  contentBucketKmsKey: IKey
  readonly apiGateway: RestApiBase
  readonly cognitoUserPoolDomain: IUserPoolDomain,
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
    const contentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      props.contentBucket,
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

    // Key Value Stores
    const functionStore = new KeyValueStore(this, "functionStore", {
      source: ImportSource.fromInline(JSON.stringify({
        data: [
          {
            key: "version",
            value: props.version
          }
        ]
      }))
    })

    // Cloudfront Functions
    /* - Inject Key Value Store ID into code
       - Remove export statement as not supported in Cloudfront functions */
    const s3ContentUriRewriteFunctionCode = readFileSync(
      resolve(import.meta.dirname, "../../cloudfrontFunctions/src/s3ContentUriRewrite.js"), "utf8").replace(
      "KVS_ID_PLACEHOLDER", functionStore.keyValueStoreId).replace("export ", "")

    const s3ContentUriRewriteFunction = new Function(this, "s3ContentUriRewriteFunction", {
      code: FunctionCode.fromInline(s3ContentUriRewriteFunctionCode),
      runtime: FunctionRuntime.JS_2_0,
      keyValueStore: functionStore,
      autoPublish: true
    })

    /* - Remove export statement as not supported in Cloudfront functions */
    const s3404UriRewriteFunctionCode = readFileSync(
      resolve(import.meta.dirname, "../../cloudfrontFunctions/src/s3404UriRewrite.js"), "utf8").replace("export ", "")

    const s3404UriRewriteFunction = new Function(this, "s3404UriRewriteFunction", {
      code: FunctionCode.fromInline(s3404UriRewriteFunctionCode),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    /* - Remove export statement as not supported in Cloudfront functions*/
    const s3404ModifyStatusCodeFunctionCode = readFileSync(
      resolve(import.meta.dirname, "../../cloudfrontFunctions/src/s3404ModifyStatusCode.js"), "utf8")
      .replace("export ", "")

    const s3404ModifyStatusCodeFunction = new Function(this, "s3404ModifyStatusCodeFunction", {
      code: FunctionCode.fromInline(s3404ModifyStatusCodeFunctionCode),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    /* - Remove export statement as not supported in Cloudfront functions*/
    const s3JwksUriRewriteFunctionCode = readFileSync(
      resolve(import.meta.dirname, "../../cloudfrontFunctions/src/s3JwksUriRewrite.js"), "utf8").replace("export ", "")

    const s3JwksUriRewriteFunction = new Function(this, "s3JwksUriRewriteFunction", {
      code: FunctionCode.fromInline(s3JwksUriRewriteFunctionCode),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
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
        origin: contentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations:[
          {
            function: s3404UriRewriteFunction,
            eventType: FunctionEventType.VIEWER_REQUEST
          },
          {
            function: s3404ModifyStatusCodeFunction,
            eventType: FunctionEventType.VIEWER_RESPONSE
          }
        ]
      },
      additionalBehaviors:{
        "/site/*": {
          origin: contentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3ContentUriRewriteFunction,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },
        "/api/*": {
          origin: apiGatewayOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: apiGatewayRequestPolicy
        },
        "/auth/*": {
          origin: cognitoOrigin,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          originRequestPolicy: cognitoRequestPolicy
        },
        "/jwks/": { // matches exactly <url>/jwks and will only serve the jwks json (vis cf function)
          origin: contentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3JwksUriRewriteFunction,
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
    const contentBucketKmsKey = (props.contentBucketKmsKey.node.defaultChild as CfnKey)
    contentBucketKmsKey.keyPolicy = contentBucketKmsKeyPolicy(cloudfrontDistribution.distributionId)
  }
}
