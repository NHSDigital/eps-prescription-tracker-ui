import {Construct} from "constructs"
import fs from "fs"

export class setConfig extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    const configFileName = this.node.tryGetContext("configFileName")

    const configDetails = JSON.parse(fs.readFileSync(configFileName, "utf-8"))

    const contextConfigKeys = [
      "serviceName",
      "VERSION_NUMBER",
      "COMMIT_ID",
      "logRetentionInDays",
      "logLevel",
      "primaryOidcClientId",
      "primaryOidcIssuer",
      "primaryOidcAuthorizeEndpoint",
      "primaryOidcTokenEndpoint",
      "primaryOidcUserInfoEndpoint",
      "primaryOidcjwksEndpoint",
      "useMockOidc",
      "mockOidcClientId",
      "mockOidcIssuer",
      "mockOidcAuthorizeEndpoint",
      "mockOidcTokenEndpoint",
      "mockOidcUserInfoEndpoint",
      "mockOidcjwksEndpoint",
      "useCustomCognitoDomain",
      "epsDomainName",
      "epsHostedZoneId",
      "allowAutoDeleteObjects",
      "cloudfrontDistributionId",
      "rumCloudwatchLogEnabled",
      "rumAppName",
      "allowLocalhostAccess",
      "cloudfrontCertArn",
      "shortCloudfrontDomain",
      "fullCloudfrontDomain",
      "fullCognitoDomain",
      "apigeeMockTokenEndpoint",
      "apigeeApiKey",
      "apigeeCIS2TokenEndpoint",
      "apigeePrescriptionsEndpoint",
      "apigeePersonalDemographicsEndpoint",
      "jwtKid",
      "ROLE_ID"
    ]
    contextConfigKeys.forEach((key) => {
      this.node.setContext(key, configDetails[key])
    })
  }
}
