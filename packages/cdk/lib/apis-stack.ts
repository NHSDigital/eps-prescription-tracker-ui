import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sam from 'aws-cdk-lib/aws-sam';

import { ApiResourcesStack } from './api_resources-stack';
import { Construct } from 'constructs';
export interface ApisStackProps extends cdk.NestedStackProps {
  /**
   * @default 'none'
   */
  readonly stackName?: string;
  /**
   * @default 'none'
   */
  readonly statusFunctionName?: string;
  /**
   * @default 'none'
   */
  readonly statusFunctionArn?: string;
  /**
   * @default 30
   */
  readonly logRetentionInDays?: number;
  /**
   * @default 30
   */
  readonly enableSplunk?: string;
  /**
   */
  readonly userPoolArn: string;
}

/**
 * PFP API's and related resources

 */
export class ApisStack extends cdk.NestedStack {
  public constructor(scope: Construct, id: string, props: ApisStackProps) {
    super(scope, id, props);

    // Applying default props
    props = {
      ...props,
      stackName: props.stackName ?? 'none',
      statusFunctionName: props.statusFunctionName ?? 'none',
      statusFunctionArn: props.statusFunctionArn ?? 'none',
      logRetentionInDays: props.logRetentionInDays ?? 30,
      enableSplunk: props.enableSplunk ?? '30',
    };

    // Transforms
    this.addTransform('AWS::Serverless-2016-10-31');

    // Resources
    const restApiGateway = new apigateway.CfnRestApi(this, 'RestApiGateway', {
      name: `${props.stackName!}-apigw`,
      endpointConfiguration: {
        types: [
          'REGIONAL',
        ],
      },
    });

    const restApiGatewayResources = new ApiResourcesStack(this, 'RestApiGatewayResources', 
      {
        additionalPolicies: [
          cdk.Fn.importValue(`${props.stackName!}:functions:${props.statusFunctionName!}:ExecuteLambdaPolicyArn`),
        ],
        apiName: `${props.stackName!}-apigw`,
        logRetentionInDays: props.logRetentionInDays!,
        enableSplunk: props.enableSplunk!,
      }
  );

    const authorizer = new apigateway.CfnAuthorizer(this, 'Authorizer', {
      name: 'cognitoAuth',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.authorization',
      providerArns: [
        props.userPoolArn!,
      ],
      restApiId: restApiGateway.ref,
    });

    const statusStatementResource = new apigateway.CfnResource(this, 'StatusStatementResource', {
      restApiId: restApiGateway.ref,
      parentId: restApiGateway.attrRootResourceId,
      pathPart: '_status',
    });

    const statusMethod = new apigateway.CfnMethod(this, 'StatusMethod', {
      restApiId: restApiGateway.ref,
      resourceId: statusStatementResource.ref,
      httpMethod: 'GET',
      authorizationType: 'COGNITO_USER_POOLS',
      authorizerId: authorizer.ref,
      integration: {
        type: 'AWS_PROXY',
        credentials: restApiGatewayResources.apiGwRoleArn,
        integrationHttpMethod: 'POST',
        uri: `arn:aws:apigateway:${this.region}:lambda:path/2015-03-31/functions/${props.statusFunctionArn!}/invocations`,
      },
    });

    const restApiGatewayDeploymentA = new apigateway.CfnDeployment(this, 'RestApiGatewayDeploymentA', {
      restApiId: restApiGateway.ref,
    });
    restApiGatewayDeploymentA.addDependency(statusMethod);

    const restApiGatewayStage = new apigateway.CfnStage(this, 'RestApiGatewayStage', {
      restApiId: restApiGateway.ref,
      stageName: 'prod',
      deploymentId: restApiGatewayDeploymentA.ref,
      tracingEnabled: true,
      accessLogSetting: {
        destinationArn: restApiGatewayResources.apiGwAccessLogsArn,
        format: '{ \"requestTime\": \"$context.requestTime\", \"apiId\": \"$context.apiId\", \"accountId\": \"$context.accountId\", \"resourcePath\": \"$context.resourcePath\", \"stage\": \"$context.stage\", \"requestId\": \"$context.requestId\", \"extendedRequestId\": \"$context.extendedRequestId\", \"status\": \"$context.status\", \"httpMethod\": \"$context.httpMethod\", \"protocol\": \"$context.protocol\", \"path\": \"$context.path\", \"responseLatency\": \"$context.responseLatency\", \"responseLength\": \"$context.responseLength\", \"domainName\": \"$context.domainName\", \"identity\": { \"sourceIp\": \"$context.identity.sourceIp\", \"userAgent\": \"$context.identity.userAgent\", \"clientCert\":{ \"subjectDN\": \"$context.identity.clientCert.subjectDN\", \"issuerDN\": \"$context.identity.clientCert.issuerDN\", \"serialNumber\": \"$context.identity.clientCert.serialNumber\", \"validityNotBefore\": \"$context.identity.clientCert.validity.notBefore\", \"validityNotAfter\": \"$context.identity.clientCert.validity.notAfter\" }}, \"integration\":{ \"error\": \"$context.integration.error\", \"integrationStatus\": \"$context.integration.integrationStatus\", \"latency\": \"$context.integration.latency\", \"requestId\": \"$context.integration.requestId\", \"status\": \"$context.integration.status\" }}',
      },
    });
  }
}
