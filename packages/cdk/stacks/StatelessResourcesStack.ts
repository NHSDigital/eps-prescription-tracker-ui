import {
  StackProps,
  Stack,
  App,
  Fn,
  CfnOutput
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
import {LambdaIntegration} from "aws-cdk-lib/aws-apigateway"
import {Bucket} from "aws-cdk-lib/aws-s3"

import {RestApiGateway} from "../resources/RestApiGateway"
import {CloudfrontFunction} from "../resources/Cloudfront/CloudfrontFunction"
import {CloudfrontDistribution} from "../resources/CloudfrontDistribution"
import {LambdaFunction} from "../resources/LambdaFunction"
import {getDefaultLambdaOptions} from "../resources/LambdaFunction/helpers"
import {nagSuppressions} from "../nagSuppressions"

export interface StatelessResourcesStackProps extends StackProps {
  readonly serviceName: string
  readonly stackName: string
  readonly version: string
}

/**
 * Clinical Prescription Tracker UI Stateless Resources

 */

export class StatelessResourcesStack extends Stack {
  public constructor(scope: App, id: string, props: StatelessResourcesStackProps) {
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

    // Define default Lambda options
    const lambdaOptions = getDefaultLambdaOptions({
      functionName: `${props.serviceName}-fetchPrescriptionData`,
      packageBasePath: "packages/cdk/resources/LambdaFunction",
      entryPoint: "fetchPrescriptionData.ts"
    })

    // Lambda for fetchPrescriptionData
    const fetchPrescriptionDataLambda = new LambdaFunction(this, "FetchPrescriptionDataLambda", {
      lambdaName: "fetchPrescriptionData",
      packageBasePath: "packages/cdk/resources/LambdaFunction",
      entryPoint: "fetchPrescriptionData.ts",
      serviceName: props.serviceName,
      stackName: props.stackName,
      lambdaEnvironmentVariables: {
        APIGEE_BASE_URL: process.env.APIGEE_BASE_URL || "https://internal-dev.api.service.nhs.uk",
        TABLE_NAME: process.env.TABLE_NAME || "DefaultTableName"
      },
      ...lambdaOptions
    })

    // --- API Gateway Route for /api/prescription-search/{id}
    const api = apiGateway.restApiGateway
    const prescriptionSearchResource = api.root
      .addResource("api")
      .addResource("prescription-search")
      .addResource("{id}")
    prescriptionSearchResource.addMethod("GET", new LambdaIntegration(fetchPrescriptionDataLambda.lambda))

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

    const s3StaticContentUriRewriteFunction = new CloudfrontFunction(this, "S3StaticContentUriRewriteFunction", {
      functionName: `${props.serviceName}-S3StaticContentUriRewriteFunction`,
      sourceFileName: "s3StaticContentUriRewrite.js",
      keyValues: [
        {
          key: "version",
          value: props.version
        }
      ]
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
        functionAssociations: [
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
        }
      }
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

    nagSuppressions(this)
  }
}
