import {Construct} from "constructs"
import {Duration} from "aws-cdk-lib"
import {ResponseHeadersPolicy, HeadersFrameOption, HeadersReferrerPolicy} from "aws-cdk-lib/aws-cloudfront"

export interface CustomResponseHeadersPolicyProps {
  policyName: string
}

export class CustomSecurityHeadersPolicy extends Construct {
  public readonly policy: ResponseHeadersPolicy

  constructor(scope: Construct, id: string, props: CustomResponseHeadersPolicyProps) {
    super(scope, id)

    this.policy = new ResponseHeadersPolicy(this, "CustomSecurityHeadersPolicy", {
      responseHeadersPolicyName: props.policyName,
      comment: "Security headers policy with inclusion of CSP",
      removeHeaders: [
        "x-amz-server-side-encryption",
        "x-amz-server-side-encryption-aws-kms-key-id",
        "x-amz-server-side-encryption-bucket-key-enabled"
      ],
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: `
            default-src 'self';
            script-src 'self' https://assets.nhs.uk;
            style-src 'self' 'unsafe-inline' https://assets.nhs.uk;
            font-src 'self' https://assets.nhs.uk;
            img-src 'self' data: https://assets.nhs.uk;
            connect-src 'self' 
                https://*.amazonaws.com 
                https://*.amazoncognito.com;
            object-src 'none';
            base-uri 'self';
            frame-ancestors 'none';
          `.replace(/\s+/g, " ").trim(),
          override: true
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true
        },
        contentTypeOptions: {
          override: true
        },
        frameOptions: {
          frameOption: HeadersFrameOption.DENY,
          override: true
        },
        referrerPolicy: {
          referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true
        }
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
            override: true
          }
        ]
      }
    })
  }
}
