import {ResourcesConfig} from "aws-amplify"
import {AUTH_CONFIG} from "@/constants/environment"

export const authConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolClientId: AUTH_CONFIG.USER_POOL_CLIENT_ID!,
      userPoolId: AUTH_CONFIG.USER_POOL_ID!,
      loginWith: {
        // Optional
        oauth: {
          domain: AUTH_CONFIG.HOSTED_LOGIN_DOMAIN!,
          scopes: [
            "openid",
            "email",
            "phone",
            "profile",
            "aws.cognito.signin.user.admin"
          ],
          redirectSignIn: [AUTH_CONFIG.REDIRECT_SIGN_IN!],
          redirectSignOut: [AUTH_CONFIG.REDIRECT_SIGN_OUT!],
          responseType: "code"
        },
        username: true,
        email: false, // Optional
        phone: false // Optional
      }
    }
  }
}
