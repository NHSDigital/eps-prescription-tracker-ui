import {Construct} from "constructs"
import {CloudfrontFunction} from "./Cloudfront/CloudfrontFunction"
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  FunctionEventType,
  IOrigin,
  OriginRequestPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront"
import {RestApiOrigin} from "aws-cdk-lib/aws-cloudfront-origins"

export interface CloudfrontBehaviorsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly apiGatewayOrigin: RestApiOrigin
  readonly apiGatewayRequestPolicy: OriginRequestPolicy
  readonly staticContentBucketOrigin: IOrigin

}

/**
 * Resources for a Cloudfront Behaviors and functions
 */

export class CloudfrontBehaviors extends Construct{
  public additionalBehaviors: Record<string, BehaviorOptions>
  public s3404UriRewriteFunction: CloudfrontFunction
  public s3404ModifyStatusCodeFunction: CloudfrontFunction
  public s3StaticContentUriRewriteFunction: CloudfrontFunction

  public constructor(scope: Construct, id: string, props: CloudfrontBehaviorsProps){
    super(scope, id)

    // Resources

    const s3404UriRewriteFunction = new CloudfrontFunction(this, "S3404UriRewriteFunction", {
      functionName: `${props.serviceName}-S3404UriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "404.html"
        }
      ]
    })

    const s3404ModifyStatusCodeFunction = new CloudfrontFunction(this, "S3404ModifyStatusCodeFunction", {
      functionName: `${props.serviceName}-S3404ModifyStatusCodeFunction`,
      sourceFileName: "s3404ModifyStatusCode.js"
    })

    const s3500UriRewriteFunction = new CloudfrontFunction(this, "S3500UriRewriteFunction", {
      functionName: `${props.serviceName}-S3500UriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "500.html"
        }
      ]
    })

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-S3StaticContentUriRewriteFunction`,
      sourceFileName: "s3StaticContentUriRewrite.js"
    })

    const apiGatewayStripPathFunction = new CloudfrontFunction(this, "ApiGatewayStripPathFunction", {
      functionName: `${props.serviceName}-ApiGatewayStripPathFunction`,
      sourceFileName: "genericStripPathUriRewrite.js",
      keyValues: [
        {
          key: "path",
          value: "/api"
        }
      ]
    })

    const s3JwksUriRewriteFunction = new CloudfrontFunction(this, "s3JwksUriRewriteFunction", {
      functionName: `${props.serviceName}-s3JwksUriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValues: [
        {
          key: "object",
          value: "jwks.json"
        }
      ]
    })

    // eslint-disable-next-line max-len
    const authDemoStaticContentUriRewriteFunction = new CloudfrontFunction(this, "authDemoStaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-authDemoStaticContentUriRewriteFunction`,
      sourceFileName: "s3StaticContentUriRewrite.js",
      keyValues: [
        {
          key: "version",
          value: "auth_demo"
        }
      ]
    })

    const additionalBehaviors = {
      "/site/*": {
        origin: props.staticContentBucketOrigin,
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
        origin: props.apiGatewayOrigin,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        originRequestPolicy: props.apiGatewayRequestPolicy,
        cachePolicy: CachePolicy.CACHING_DISABLED,
        functionAssociations: [
          {
            function: apiGatewayStripPathFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          }
        ]
      },
      "/jwks/": {/* matches exactly <url>/jwks and will only serve the jwks json (via cf function) */
        origin: props.staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: s3JwksUriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          }
        ]
      },
      "/auth_demo/*": {
        origin: props.staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: authDemoStaticContentUriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          }
        ]
      },

      "/500.html": { // matches exactly <url>/500.html and will only serve the 500.html page (via cf function)
        origin: props.staticContentBucketOrigin,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: s3500UriRewriteFunction.function,
            eventType: FunctionEventType.VIEWER_REQUEST
          }
        ]
      }
    }

    //Outputs
    this.additionalBehaviors = additionalBehaviors
    this.s3404UriRewriteFunction = s3404UriRewriteFunction
    this.s3404ModifyStatusCodeFunction = s3404ModifyStatusCodeFunction
    this.s3StaticContentUriRewriteFunction = s3StaticContentUriRewriteFunction
  }
}
