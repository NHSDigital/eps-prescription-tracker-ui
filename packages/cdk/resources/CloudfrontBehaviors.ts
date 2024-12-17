import {Construct} from "constructs"
import {CloudfrontFunction} from "./Cloudfront/CloudfrontFunction"
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  FunctionEventType,
  ImportSource,
  IOrigin,
  KeyValueStore,
  OriginRequestPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront"
import {RestApiOrigin} from "aws-cdk-lib/aws-cloudfront-origins"

/**
 * Resources for cloudfront behaviors

 */

export interface CloudfrontBehaviorsProps {
  readonly serviceName: string
  readonly stackName: string
  readonly apiGatewayOrigin: RestApiOrigin
  readonly apiGatewayRequestPolicy: OriginRequestPolicy
  readonly staticContentBucketOrigin: IOrigin
}

/**
 * Resources for a Cloudfront Behaviors and functions
 * Any rewrites for cloudfront requests should go here
 */

export class CloudfrontBehaviors extends Construct{
  public readonly additionalBehaviors: Record<string, BehaviorOptions>
  public readonly s3404UriRewriteFunction: CloudfrontFunction
  public readonly s3404ModifyStatusCodeFunction: CloudfrontFunction
  public readonly s3StaticContentUriRewriteFunction: CloudfrontFunction
  public readonly keyValueStore: KeyValueStore

  public constructor(scope: Construct, id: string, props: CloudfrontBehaviorsProps){
    super(scope, id)

    // Resources

    const keyValueStore = new KeyValueStore(this, "FunctionsStore", {
      keyValueStoreName: `${props.serviceName}-KeyValueStore`,
      source: ImportSource.fromInline(JSON.stringify({data: [
        {
          key: "404_rewrite",
          value: "404.html"
        },
        {
          key: "500_rewrite",
          value: "500.html"
        },
        {
          key: "site_basePath",
          value: "/site"
        },
        {
          key: "api_path",
          value: "/api"
        },
        {
          key: "jwks_rewrite",
          value: "jwks.json"
        },
        {
          key: "auth_demo_version",
          value: "auth_demo"
        },
        {
          key: "auth_demo_basePath",
          value: "/auth_demo"
        }
      ]}))
    })

    const s3404UriRewriteFunction = new CloudfrontFunction(this, "S3404UriRewriteFunction", {
      functionName: `${props.serviceName}-S3404UriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValueStore: keyValueStore,
      codeReplacements: [
        {
          valueToReplace: "OBJECT_PLACEHOLDER",
          replacementValue: "404_rewrite"
        }
      ]
    })

    const s3404ModifyStatusCodeFunction = new CloudfrontFunction(this, "S3404ModifyStatusCodeFunction", {
      functionName: `${props.serviceName}-S3404ModifyStatusCodeFunction`,
      sourceFileName: "s3404ModifyStatusCode.js",
      keyValueStore: keyValueStore
    })
    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    s3404ModifyStatusCodeFunction.node.addDependency(s3404UriRewriteFunction)

    const s3500UriRewriteFunction = new CloudfrontFunction(this, "S3500UriRewriteFunction", {
      functionName: `${props.serviceName}-S3500UriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValueStore: keyValueStore,
      codeReplacements: [
        {
          valueToReplace: "OBJECT_PLACEHOLDER",
          replacementValue: "500_rewrite"
        }
      ]
    })
    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    s3500UriRewriteFunction.node.addDependency(s3404ModifyStatusCodeFunction)

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-S3StaticContentUriRewriteFunction`,
      sourceFileName: "s3StaticContentUriRewrite.js",
      keyValueStore: keyValueStore,
      codeReplacements: [
        {
          valueToReplace: "BASEPATH_PLACEHOLDER",
          replacementValue: "site_basePath"
        },
        {
          valueToReplace: "VERSION_PLACEHOLDER",
          replacementValue: "site_version"
        }
      ]
    })
    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    s3StaticContentUriRewriteFunction.node.addDependency(s3500UriRewriteFunction)

    const apiGatewayStripPathFunction = new CloudfrontFunction(this, "ApiGatewayStripPathFunction", {
      functionName: `${props.serviceName}-ApiGatewayStripPathFunction`,
      sourceFileName: "genericStripPathUriRewrite.js",
      keyValueStore: keyValueStore,
      codeReplacements: [
        {
          valueToReplace: "PATH_PLACEHOLDER",
          replacementValue: "api_path"
        }
      ]
    })
    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    apiGatewayStripPathFunction.node.addDependency(s3StaticContentUriRewriteFunction)

    const s3JwksUriRewriteFunction = new CloudfrontFunction(this, "s3JwksUriRewriteFunction", {
      functionName: `${props.serviceName}-s3JwksUriRewriteFunction`,
      sourceFileName: "genericS3FixedObjectUriRewrite.js",
      keyValueStore: keyValueStore,
      codeReplacements: [
        {
          valueToReplace: "OBJECT_PLACEHOLDER",
          replacementValue: "jwks_rewrite"
        }
      ]
    })
    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    s3JwksUriRewriteFunction.node.addDependency(apiGatewayStripPathFunction)

    // eslint-disable-next-line max-len
    const authDemoStaticContentUriRewriteFunction = new CloudfrontFunction(this, "authDemoStaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-authDemoStaticContentUriRewriteFunction`,
      sourceFileName: "s3StaticContentUriRewrite.js",
      keyValueStore: keyValueStore,
      codeReplacements: [
        {
          valueToReplace: "BASEPATH_PLACEHOLDER",
          replacementValue: "auth_demo_basePath"
        },
        {
          valueToReplace: "VERSION_PLACEHOLDER",
          replacementValue: "auth_demo_version"
        }
      ]
    })
    /* Add dependency on previous function to force them to build one by one to avoid aws limits
    on how many can be created simultaneously */
    authDemoStaticContentUriRewriteFunction.node.addDependency(s3JwksUriRewriteFunction)

    const additionalBehaviors = {
      "/site*": {
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
    this.keyValueStore = keyValueStore
  }
}
