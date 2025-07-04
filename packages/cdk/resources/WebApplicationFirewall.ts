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
  readonly githubAllowListIpv6: Array<string>
  readonly wafAllowGaRunnerConnectivity: boolean
  readonly scope: string
}

export class WebACL extends Construct {
  public readonly githubAllowListIpv4: wafv2.CfnIPSet
  public readonly githubAllowListIpv6: wafv2.CfnIPSet
  public readonly wafAllowGaRunnerConnectivity: boolean
  public readonly webAcl: wafv2.CfnWebACL
  public readonly attrArn: string
  public readonly allowedHeaders?: Map<string, string>

  public constructor(
    scope: Construct,
    id: string,
    props: {
      serviceName: string
      rateLimitTransactions: number
      rateLimitWindowSeconds: number
      githubAllowListIpv4: Array<string>
      githubAllowListIpv6: Array<string>
      wafAllowGaRunnerConnectivity: boolean
      allowedHeaders?: Map<string, string>
      scope: string
    }
  ) {
    super(scope, id)

    if (props.wafAllowGaRunnerConnectivity && props.githubAllowListIpv4.length > 0) {
      this.githubAllowListIpv4 = new wafv2.CfnIPSet(this, "githubAllowListIpv4", {
        addresses: props.githubAllowListIpv4,
        ipAddressVersion: "IPV4",
        scope: props.scope,
        description: "Allow list IPs that may originate outside of the UK or Crown dependencies.",
        name: `${props.serviceName}-PermittedGithubActionRunners`
      })
    }

    if (props.wafAllowGaRunnerConnectivity && props.githubAllowListIpv6.length > 0) {
      this.githubAllowListIpv6 = new wafv2.CfnIPSet(this, "githubAllowListIpv6", {
        addresses: props.githubAllowListIpv6,
        ipAddressVersion: "IPV6",
        scope: props.scope,
        description: "Allow list IPs that may originate outside of the UK or Crown dependencies.",
        name: `${props.serviceName}-PermittedGithubActionRunnersIPV6`
      })
    }

    const rules: Array<wafv2.CfnWebACL.RuleProperty> = []
    let nextPriority = 0

    if (props.wafAllowGaRunnerConnectivity && props.githubAllowListIpv4.length > 0) {
      rules.push({
        name: "PermitGithubActionsRunnersOutsideUKandCrown",
        priority: nextPriority++,
        action: {allow: {}},
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
      })
    }

    if (props.wafAllowGaRunnerConnectivity && props.githubAllowListIpv6.length > 0) {
      rules.push({
        name: "PermitGithubActionsRunnersOutsideUKandCrownIPv6",
        priority: nextPriority++,
        action: {allow: {}},
        statement: {
          ipSetReferenceStatement: {
            arn: this.githubAllowListIpv6.attrArn
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: false,
          cloudWatchMetricsEnabled: true,
          metricName: `${props.serviceName}-PermitGithubActionsRunnersOutsideUKandCrownIPv6`
        }
      })
    }

    // Permit Allowed Headers Only rule (negated OR for each header)
    if (props.allowedHeaders && props.allowedHeaders.size > 0) {
      for (const [headerName, headerValue] of props.allowedHeaders.entries()) {
        rules.push({
          name: `BlockRequestsMissingOrIncorrectHeader-${headerName}`,
          priority: nextPriority++,
          action: {block: {}},
          statement: {
            notStatement: {
              statement: {
                byteMatchStatement: {
                  searchString: headerValue,
                  fieldToMatch: {
                    singleHeader: {Name: headerName}
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
            sampledRequestsEnabled: false,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.serviceName}-BlockRequestsMissingOrIncorrectHeader-${headerName}`
          }
        })
      }
    }

    // Permit UK and Crown Dependent Countries
    rules.push({
      name: "PermitUKandCrownDependentCountries",
      priority: nextPriority++,
      action: {allow: {}},
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
    })

    // Block All Other Countries
    rules.push({
      name: "BlockAllOtherCountries",
      priority: nextPriority++,
      action: {block: {}},
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
    })

    // Rate Limit Rule
    rules.push({
      name: "RateLimitRule",
      priority: nextPriority++,
      action: {block: {}},
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
    })

    const webAcl = new wafv2.CfnWebACL(this, "CloudfrontWebAcl", {
      name: `${props.serviceName}-WebAcl`,
      defaultAction: {allow: {}},
      scope: props.scope,
      visibilityConfig: {
        sampledRequestsEnabled: false,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.serviceName}-WebAcl`
      },
      rules,
      tags: [
        {
          key: "Name",
          value: `${props.serviceName}-WebAcl`
        }
      ]
    })

    this.webAcl = webAcl
    this.attrArn = webAcl.attrArn
  }
}
