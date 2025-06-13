import {Construct} from "constructs"
import * as wafv2 from "aws-cdk-lib/aws-wafv2"

/**
 * WAF ACL and supporting resources
 */
export interface WebACLProps {
  readonly serviceName: string
  readonly rateLimitTransactions: number // Total transactions limit within an evaluation window (seconds)
  readonly rateLimitWindowSeconds?: number // Minimum is 60 seconds, default is 60 seconds.
  readonly githubAllowListIpv4: Array<string>
  readonly wafAllowGaRunnerConnectivity: boolean
}

export class WebACL extends Construct {
  public readonly githubAllowListIpv4: wafv2.CfnIPSet
  public readonly wafAllowGaRunnerConnectivity: boolean
  public readonly webAcl: wafv2.CfnWebACL

  public constructor(
    scope: Construct,
    id: string,
    props: {
      serviceName: string
      rateLimitTransactions: number
      rateLimitWindowSeconds: number
      githubAllowListIpv4: Array<string>
      wafAllowGaRunnerConnectivity: boolean
    }
  ) {
    super(scope, id)

    this.githubAllowListIpv4 = new wafv2.CfnIPSet(this, "githubAllowListIpv4", {
      addresses: props.githubAllowListIpv4,
      ipAddressVersion: "IPV4",
      scope: "CLOUDFRONT",
      description: "Allow list IPs that may originate outside of the UK or Crown dependencies.",
      name: `${props.serviceName}-PermittedGithubActionRunners`
    })

    this.webAcl = new wafv2.CfnWebACL(this, "CloudfrontWebAcl", {
      name: `${props.serviceName}-WebAcl`,
      defaultAction: {
        allow: {}
      },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        sampledRequestsEnabled: false,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.serviceName}-WebAcl`
      },
      rules: [
        ...(props.wafAllowGaRunnerConnectivity
          ? [
            {
              name: "PermitGithubActionsRunnersOutsideUKandCrown",
              priority: 0,
              action: {
                allow: {}
              },
              statement: {
                ipSetReferenceStatement: {
                  arn: this.githubAllowListIpv4.attrArn
                }
              },
              visibilityConfig: {
                sampledRequestsEnabled: false,
                cloudWatchMetricsEnabled: true,
                metricName: `${props.serviceName}-PermitGithubActionsRunnersOutsideUKandCrown`
              }
            }
          ]
          : []),
        {
          name: "PermitUKandCrownDependentCountries",
          priority: 1,
          action: {
            allow: {}
          },
          statement: {
            geoMatchStatement: {
              countryCodes: [
                "GB", // United Kingdom
                "GG", // Guernsey
                "JE", // Jersey
                "IM" // Isle of Man
              ]
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: false,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.serviceName}-PermitUKandCrownDependentCountries`
          }
        },
        {
          name: "BlockAllOtherCountries",
          priority: 2,
          action: {
            block: {}
          },
          statement: {
            notStatement: {
              statement: {
                geoMatchStatement: {
                  countryCodes: [
                    "GB", // United Kingdom
                    "GG", // Guernsey
                    "JE", // Jersey
                    "IM" // Isle of Man
                  ]
                }
              }
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: false,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.serviceName}-BlockAllOtherCountries`
          }
        },
        {
          name: "RateLimitRule",
          priority: 3,
          action: {
            block: {}
          },
          statement: {
            rateBasedStatement: {
              limit: props.rateLimitTransactions,
              evaluationWindowSec: props.rateLimitWindowSeconds,
              aggregateKeyType: "IP",
              scopeDownStatement: {
                byteMatchStatement: {
                  searchString: "site", // This is the CPT UI site path
                  fieldToMatch: {
                    uriPath: {}
                  },
                  positionalConstraint: "EXACTLY",
                  textTransformations: [
                    {
                      priority: 0,
                      type: "NONE"
                    }
                  ]
                }
              }
            }
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.serviceName}-RateLimitRule`
          }
        }
      ],
      tags: [
        {
          key: "Name",
          value: `${props.serviceName}-WebAcl`
        }
      ]
    })
  }
}
