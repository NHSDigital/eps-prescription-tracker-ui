import {App, Stack, StackProps} from "aws-cdk-lib"
import {HostedZone} from "aws-cdk-lib/aws-route53"
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager"
import {S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {
  KeyValueStore,
  ImportSource,
  Function,
  FunctionCode,
  FunctionRuntime,
  Distribution,
  FunctionEventType,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront"

import {IBucket} from "aws-cdk-lib/aws-s3"

export interface CloudfrontStackProps extends StackProps {
  readonly stackName: string
  readonly version: string
  readonly domainName: string
  readonly hostedZoneId: string
  readonly contentBucket: IBucket
}

export class CloudfrontStack extends Stack {
  public constructor(scope: App, id: string, props: CloudfrontStackProps) {
    super(scope, id, props)

    // Cert
    const hostedZone = HostedZone.fromHostedZoneId(this, "hostedZone", props.hostedZoneId)
    const cloudfrontCertificate = new Certificate(this, `${props.stackName}-CloudfrontCertificate`, {
      domainName: props.domainName,
      validation: CertificateValidation.fromDns(hostedZone)
    })

    // Origins
    const contentBucketOrigin = S3BucketOrigin.withOriginAccessControl(props.contentBucket)

    // todo: add api gateway & auth origins

    // Key Value Stores
    const functionStore = new KeyValueStore(this, "cloudfrontFunctionKeyValueStore", {
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
    const s3ContentUrlRewriteFunction = new Function(this, "s3ContentUrlRewriteFunction", {
      code: FunctionCode.fromFile({
        filePath: "../../cloudfrontFunctions/s3ContentUrlRewrite.js" // todo: write the function
      }),
      runtime: FunctionRuntime.JS_2_0,
      keyValueStore: functionStore,
      autoPublish: true
    })

    const s3404UrlRewriteFunction = new Function(this, "s3404UrlRewriteFunction", {
      code: FunctionCode.fromFile({
        filePath: "../../cloudfrontFunctions/s3404UrlRewrite.js" // todo: write the function
      }),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    const s3404ModifyResponseFunction = new Function(this, "s3404ModifyResponseFunction", {
      code: FunctionCode.fromFile({
        filePath: "../../cloudfrontFunctions/s3404ModifyResponse.js" // todo: write the function
      }),
      runtime: FunctionRuntime.JS_2_0,
      autoPublish: true
    })

    // Distribution
    new Distribution(this, "CloudfrontDistribution", {
      domainNames: [props.domainName],
      certificate: cloudfrontCertificate,
      defaultBehavior: {
        origin: contentBucketOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations:[
          {
            function: s3404UrlRewriteFunction,
            eventType: FunctionEventType.VIEWER_REQUEST
          },
          {
            function: s3404ModifyResponseFunction,
            eventType: FunctionEventType.VIEWER_RESPONSE
          }
        ]
      },
      additionalBehaviors:{
        "/site/*": {
          origin: contentBucketOrigin,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3ContentUrlRewriteFunction,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        } // todo: add /api & /auth behaviors
      }
    })
  }
}
