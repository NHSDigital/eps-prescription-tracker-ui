import {DeepPartialAmplifyGeneratedConfigs} from "@aws-amplify/plugin-types"
import {ClientConfig} from "@aws-amplify/client-config"
import { ResourcesConfig } from "aws-amplify"


// TODO
// Need a way to get these at deploy time as they come from the cloudformation deployment

//const userPoolId = "eu-west-2_cwWILYjts" // This is the User Pool ID from AWS::Cognito::UserPool
//const userPoolClientId = "1v2u6e8vavkestrv7e30tvfblm" // This is the Client ID from AWS::Cognito::UserPoolClient
//const hostedLoginDomain = "eps-dev.auth.eu-west-2.amazoncognito.com" // This is the domain from AWS::Cognito::UserPoolDomain

const userPoolId = "eu-west-2_GlSIbaNTD" // This is the User Pool ID from AWS::Cognito::UserPool
const userPoolClientId = "2rv1rip193mnfhik70e9j85hkn" // This is the Client ID from AWS::Cognito::UserPoolClient
const hostedLoginDomain = "id.cpt-ui-pr-19.dev.eps.national.nhs.uk" // This is the domain from AWS::Cognito::UserPoolDomain

export const authConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
          userPoolClientId: userPoolClientId,
          userPoolId: userPoolId,
          loginWith: { // Optional
            oauth: {
              domain: hostedLoginDomain,
              scopes: ['openid','email','phone','profile','aws.cognito.signin.user.admin'],
              redirectSignIn: ['http://localhost:3000/auth/'],
              redirectSignOut: ['http://localhost:3000/'],
              responseType: 'code',
            },
            username: true,
            email: false, // Optional
            phone: false, // Optional
          }
        }
      }
}
