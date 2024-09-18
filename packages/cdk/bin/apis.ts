#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import {MainTemplateStack} from "../stacks/main_template-stack"

const app = new cdk.App()
new MainTemplateStack(app, "apis", {
  primaryOidcClientId: process.env["Auth0ClientID"] as string,
  primaryOidClientSecret: process.env["Auth0ClientSecret"] as string,
  primaryOidcIssuer: process.env["Auth0Issuer"] as string,
  primaryOidcAuthorizeEndpoint: process.env["Auth0AuthorizeEndpoint"] as string,
  primaryOidcTokenEndpoint: process.env["Auth0TokenEndpoint"] as string,
  primaryOidcUserInfoEndpoint: process.env["Auth0UserInfoEndpoint"] as string,
  primaryOidcjwksEndpoint: process.env["Auth0JWKSEndpoint"] as string,
  userPoolTlsCertificateArn: process.env["UserPoolTLSCertificateArn"] as string
})
