import {DeepPartialAmplifyGeneratedConfigs} from "@aws-amplify/plugin-types"
import {ClientConfig} from "@aws-amplify/client-config"
import { ResourcesConfig } from "aws-amplify"


// TODO
// Need a way to get these at deploy time as they come from the cloudformation deployment
const userPoolId = "eu-west-2_IlqHxHhN7" // This is the User Pool ID from AWS::Cognito::UserPool
const userPoolClientId = "1pi47m587bjbh6f3iaqgdpq3qi" // This is the Client ID from AWS::Cognito::UserPoolClient
const hostedLoginDomain = "tracker-auth.auth.eu-west-2.amazoncognito.com" // This is the domain from AWS::Cognito::UserPoolDomain

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
