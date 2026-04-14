import {Construct} from "constructs"
import {CfnIPSet, CfnLoggingConfiguration, CfnWebACL} from "aws-cdk-lib/aws-wafv2"

export interface AllowList {
  readonly ipv4: Array<string>
  readonly ipv6: Array<string>
}

/**
 * WAF ACL and supporting resources
 */
export interface WebACLProps {
  readonly serviceName: string
  readonly rateLimitTransactions: number // Total transactions limit within an evaluation window (seconds)
  readonly rateLimitWindowSeconds?: number // Minimum is 60 seconds, default is 60 seconds.
  readonly githubAllowList?: AllowList
  readonly allowedHeaders?: Map<string, string>
  readonly scope: string
  readonly wafLogGroupName: string
}

export class WebACL extends Construct {
  public readonly webAcl: CfnWebACL
  public readonly attrArn: string
  public readonly allowedHeaders?: Map<string, string>

  public constructor(
    scope: Construct,
    id: string,
    props: WebACLProps
  ) {
    super(scope, id)

    const rules: Array<CfnWebACL.RuleProperty> = []
    let nextPriority = 0

    if (props.githubAllowList) {
      const githubAllowListIpv4 = new CfnIPSet(this, "githubAllowListIpv4", {
        addresses: props.githubAllowList.ipv4,
        ipAddressVersion: "IPV4",
        scope: props.scope,
        description: "Allow list IPs that may originate outside of the UK or Crown dependencies.",
        name: `${props.serviceName}-PermittedGithubActionRunners`
      })
      rules.push({
        name: "PermitGithubActionsRunnersOutsideUKandCrown",
        priority: nextPriority++,
        action: {allow: {}},
        statement: {
          ipSetReferenceStatement: {
            arn: githubAllowListIpv4.attrArn
          }
        },
        visibilityConfig: {
          sampledRequestsEnabled: false,
          cloudWatchMetricsEnabled: true,
          metricName: `${props.serviceName}-PermitGithubActionsRunnersOutsideUKandCrown`
        }
      })

      const githubAllowListIpv6 = new CfnIPSet(this, "githubAllowListIpv6", {
        addresses: props.githubAllowList.ipv6,
        ipAddressVersion: "IPV6",
        scope: props.scope,
        description: "Allow list IPs that may originate outside of the UK or Crown dependencies.",
        name: `${props.serviceName}-PermittedGithubActionRunnersIPV6`
      })
      rules.push({
        name: "PermitGithubActionsRunnersOutsideUKandCrownIPv6",
        priority: nextPriority++,
        action: {allow: {}},
        statement: {
          ipSetReferenceStatement: {
            arn: githubAllowListIpv6.attrArn
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

    const webAcl = new CfnWebACL(this, "CloudfrontWebAcl", {
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

    new CfnLoggingConfiguration(scope, "webAclLoggingConfiguration", {
      logDestinationConfigs: [ props.wafLogGroupName ],
      resourceArn: webAcl.attrArn // Arn of Acl
    })

    this.webAcl = webAcl
    this.attrArn = webAcl.attrArn
  }
}
