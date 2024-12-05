import { ResourcesConfig } from "aws-amplify"

const userPoolId = process.env["NEXT_PUBLIC_userPoolId"] // This is the User Pool ID from AWS::Cognito::UserPool
const userPoolClientId = process.env["NEXT_PUBLIC_userPoolClientId"] // This is the Client ID from AWS::Cognito::UserPoolClient
const hostedLoginDomain = process.env["NEXT_PUBLIC_hostedLoginDomain"] // This is the domain from AWS::Cognito::UserPoolDomain
const redirectSignIn = process.env["NEXT_PUBLIC_redirectSignIn"]
const redirectSignOut = process.env["NEXT_PUBLIC_redirectSignIn"]


if (
  !userPoolId ||
  !userPoolClientId ||
  !hostedLoginDomain ||
  !redirectSignIn ||
  !redirectSignOut
) {
  console.error("Cognito authorization configuration environment variables not set.")
}


export const authConfig: ResourcesConfig = {
    Auth: {
        Cognito: {
          userPoolClientId: userPoolClientId!,
          userPoolId: userPoolId!,
          loginWith: { // Optional
            oauth: {
              domain: hostedLoginDomain!,
              scopes: ['openid','email','phone','profile','aws.cognito.signin.user.admin'],
              redirectSignIn: [redirectSignIn!],
              redirectSignOut: [redirectSignOut!],
              responseType: 'code',
            },
            username: true,
            email: false, // Optional
            phone: false, // Optional
          }
        }
      }
}
