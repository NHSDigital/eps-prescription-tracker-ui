#!/usr/bin/env node
import "source-map-support/register"
import * as cdk from "aws-cdk-lib"
import {MainTemplateStack} from "../lib/main_template-stack"

const app = new cdk.App()
new MainTemplateStack(app, "apis", {
  primaryOidcClientId: "foo",
  primaryOidClientSecret: "bar",
  primaryOidcIssuer: "foo",
  primaryOidcAuthorizeEndpoint: "bar",
  primaryOidcTokenEndpoint: "foo",
  primaryOidcUserInfoEndpoint: "bar",
  primaryOidcjwksEndpoint: "foo",
  userPoolTlsCertificateArn: "bar"
})
