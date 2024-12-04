import { ResourcesConfig } from "aws-amplify"

const userPoolId = process.env["REACT_APP_userPoolId"] // This is the User Pool ID from AWS::Cognito::UserPool
const userPoolClientId = process.env["REACT_APP_userPoolClientId"] // This is the Client ID from AWS::Cognito::UserPoolClient
const hostedLoginDomain = process.env["REACT_APP_hostedLoginDomain"] // This is the domain from AWS::Cognito::UserPoolDomain
const redirectSignIn = process.env["REACT_APP_redirectSignIn"]
const redirectSignOut = process.env["REACT_APP_redirectSignIn"]

if (!userPoolId ||!userPoolClientId ||!hostedLoginDomain ||!redirectSignIn ||!redirectSignOut) {
    throw new Error(
        // eslint-disable-next-line max-len
        "Missing required environment variables. Make sure you have set REACT_APP_userPoolId, REACT_APP_userPoolClientId, REACT_APP_hostedLoginDomain, REACT_APP_redirectSignIn, and REACT_APP_redirectSignOut."
    )
}


export const authConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
          userPoolClientId: userPoolClientId,
          userPoolId: userPoolId,
          loginWith: { // Optional
            oauth: {
              domain: hostedLoginDomain,
              scopes: ['openid','email','phone','profile','aws.cognito.signin.user.admin'],
              redirectSignIn: [redirectSignIn],
              redirectSignOut: [redirectSignOut],
              responseType: 'code',
            },
            username: true,
            email: false, // Optional
            phone: false, // Optional
          }
        }
      }
}
