import {
  StackProps,
  Stack,
  App,
  Fn,
  CfnOutput,
  Duration
} from "aws-cdk-lib"
import {
  AccessLevel,
  AllowedMethods,
  FunctionEventType,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront"
import {RestApiOrigin, S3BucketOrigin} from "aws-cdk-lib/aws-cloudfront-origins"
import {Bucket} from "aws-cdk-lib/aws-s3"

import {RestApiGateway} from "../resources/RestApiGateway"
import {CloudfrontFunction} from "../resources/Cloudfront/CloudfrontFunction"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {nagSuppressions} from "../nagSuppressions"

// Lambda resources
import {AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration} from "aws-cdk-lib/aws-apigateway"
import {TrackerUserInfo} from "../resources/TrackerUserInfo/TrackerUserInfo"
import {CfnUserPool, UserPool} from "aws-cdk-lib/aws-cognito"
import {CfnWebACL, CfnWebACLAssociation} from "aws-cdk-lib/aws-wafv2"

export interface StatelessResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI Stateful Resources

 */

export class StatelessResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatelessResourcesStackProps){
    super(scope, id, props)

    // Context
    /* context values passed as --context cli arguments are passed as strings so coerce them to expected types*/

    // Imports
    const staticContentBucket = Bucket.fromBucketArn(
      this, "StaticContentBucket", Fn.importValue(`${props.serviceName}-stateful-resources:StaticContentBucket:Arn`))

    // Resources
    // - API Gateway
    const apiGateway = new RestApiGateway(this, "ApiGateway", {
      serviceName: props.serviceName,
      stackName: props.stackName
    })

    // Protect the gateway with WAFv2
    const webAcl = new CfnWebACL(this, "WebACL", {
      defaultAction: {allow: {}},
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.serviceName}-web-acl`,
        sampledRequestsEnabled: true
      },
      rules: [
        {
          name: "AWS-AWSManagedRulesCommonRuleSet",
          priority: 0,
          statement: {
            managedRuleGroupStatement: {
              name: "AWSManagedRulesCommonRuleSet",
              vendorName: "AWS"
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.serviceName}-aws-managed-rules`,
            sampledRequestsEnabled: true
          }
        }
      ]
    })
    new CfnWebACLAssociation(this, "WebACLAssociation", {
      resourceArn: apiGateway.restApiGateway.deploymentStage.stageArn,
      webAclArn: webAcl.attrArn
    })

    // --- Methods & Resources

    // - Cloudfront
    // --- Origins
    const staticContentBucketOrigin = S3BucketOrigin.withOriginAccessControl(
      staticContentBucket,
      {
        originAccessLevels: [AccessLevel.READ]
      }
    )

    const apiGatewayOrigin = new RestApiOrigin(apiGateway.restApiGateway, {
      customHeaders: {
        "destination-apigw-id": apiGateway.restApiGateway.restApiId // for later apigw waf stuff
      }
    })

    // --- Origin Request Policies
    /* Allow all for now, may want to review these at a later stage */
    const apiGatewayRequestPolicy = new OriginRequestPolicy(this, "apiGatewayRequestPolicy", {
      originRequestPolicyName: `${props.serviceName}-ApiGatewayRequestPolicy`,
      cookieBehavior: OriginRequestCookieBehavior.all(),
      headerBehavior: OriginRequestHeaderBehavior.all()
    })

    // --- Cache Policies
    /* todo - to follow in a later ticket */

    // --- Functions
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

    // --- Distribution
    const cloudfrontDistribution = new CloudfrontDistribution(this, "CloudfrontDistribution", {
      serviceName: props.serviceName,
      stackName: props.stackName,
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
      additionalBehaviors: {
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
        "/jwks/": {/* matches exactly <url>/jwks and will only serve the jwks json (via cf function) */
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3JwksUriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        },

        "/500.html": { // matches exactly <url>/500.html and will only serve the 500.html page (via cf function)
          origin: staticContentBucketOrigin,
          allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          functionAssociations: [
            {
              function: s3500UriRewriteFunction.function,
              eventType: FunctionEventType.VIEWER_REQUEST
            }
          ]
        }
      },
      errorResponses: [
        {
          httpStatus: 500,
          responseHttpStatus: 500,
          responsePagePath: "/500.html",
          ttl: Duration.seconds(10)
        },
        {
          httpStatus: 403,
          responseHttpStatus: 500,
          responsePagePath: "/500.html",
          ttl: Duration.seconds(10)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
          ttl: Duration.seconds(10)
        }
      ]
    })

    // --- Lambdas
    const trackerUserInfo = new TrackerUserInfo(this, "TrackerUserInfo", {
      serviceName: props.serviceName,
      stackName: props.stackName
    })

    // Add /trackerUserInfo resource to API Gateway
    const trackerUserInfoResource = apiGateway.restApiGateway.root.addResource("trackerUserInfo")

    // Authorisation control for the lambda (the american spelling causes pain)
    // What user pool should this use??? As a temporary measure, I suppose I'll define one, but this needs to be removed
    const userPool = new UserPool(this, "UserPool", {
      userPoolName: `${props.serviceName}-user-pool`,
      selfSignUpEnabled: false,
      signInAliases: {username: true, email: true},
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true
      }
      // AIAIK, this is also where we would require MFA, which cfn also nags about...
    })

    // Set advanced security mode to ENFORCED
    const cfnUserPool = userPool.node.defaultChild as CfnUserPool
    cfnUserPool.userPoolAddOns = {
      advancedSecurityMode: "ENFORCED"
    }

    // Create the authoriSer
    const authorizer = new CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [userPool],
      authorizerName: `${props.serviceName}-authorizer`
    })

    // Add the resource to the lambda
    trackerUserInfoResource.addMethod("GET", new LambdaIntegration(trackerUserInfo.lambdaFunction.lambda), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.COGNITO
    })

    /* Resources to add:
      - api gateway resources
      - lambdas
      - state machines
    */

    // Outputs

    // Exports
    new CfnOutput(this, "CloudfrontDistributionId", {
      value: cloudfrontDistribution.distribution.distributionId,
      exportName: `${props.stackName}:cloudfrontDistribution:Id`
    })
    new CfnOutput(this, "StaticRewriteKeyValueStoreArn", {
      value: s3StaticContentUriRewriteFunction.functionStore?.keyValueStoreArn,
      exportName: `${props.stackName}:StaticRewriteKeyValueStor:Arn`
    })

    nagSuppressions(this)
  }
}
