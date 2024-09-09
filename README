# Electronic Prescription Service Clinical Prescription Tracker UI

![Build](https://github.com/NHSDigital/eps-prescription-tracker-uii/workflows/release/badge.svg?branch=main)

This is the code for the Clinical Prescription Tracker UI.

- `packages/client` Client side react front end for clinical prescription tracker UI
- `packages/server/` Server side for clinical prescription tracker UI.
- `SAMtemplates/` Contains the SAM templates used to define the stacks.
- `scripts/` Utilities helpful to developers of this specification.
- `.devcontainer` Contains a dockerfile and vscode devcontainer definition.
- `.github` Contains github workflows that are used for building and deploying from pull requests and releases.
- `.vscode` Contains vscode workspace file.


## Contributing

Contributions to this project are welcome from anyone, providing that they conform to the [guidelines for contribution](https://github.com/NHSDigital/eps-prescription-tracker-ui/blob/main/CONTRIBUTING.md) and the [community code of conduct](https://github.com/NHSDigital/eps-prescription-tracker-ui/blob/main/CODE_OF_CONDUCT.md).

### Licensing

This code is dual licensed under the MIT license and the OGL (Open Government License). Any new work added to this repository must conform to the conditions of these licenses. In particular this means that this project may not depend on GPL-licensed or AGPL-licensed libraries, as these would violate the terms of those libraries' licenses.

The contents of this repository are protected by Crown Copyright (C).

## Development

It is recommended that you use visual studio code and a devcontainer as this will install all necessary components and correct versions of tools and languages.  
See https://code.visualstudio.com/docs/devcontainers/containers for details on how to set this up on your host machine.  
There is also a workspace file in .vscode that should be opened once you have started the devcontainer. The workspace file can also be opened outside of a devcontainer if you wish.  
The project uses [SAM](https://aws.amazon.com/serverless/sam/) to develop and deploy the APIs and associated resources.

All commits must be made using [signed commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)

Once the steps at the link above have been completed. Add to your ~/.gnupg/gpg.conf as below:

```
use-agent
pinentry-mode loopback
```

and to your ~/.gnupg/gpg-agent.conf as below:

```
allow-loopback-pinentry
```

As described here:
https://stackoverflow.com/a/59170001

You will need to create the files, if they do not already exist.
This will ensure that your VSCode bash terminal prompts you for your GPG key password.

You can cache the gpg key passphrase by following instructions at https://superuser.com/questions/624343/keep-gnupg-credentials-cached-for-entire-user-session

### Setup

Ensure you have the following lines in the file .envrc

```
export AWS_DEFAULT_PROFILE=prescription-dev
export stack_name=<UNIQUE_NAME_FOR_YOU>
```

UNIQUE_NAME_FOR_YOU should be a unique name for you with no underscores in it - eg anthony-brown-1

Once you have saved .envrc, start a new terminal in vscode and run this command to authenticate against AWS

```
make aws-configure
```

Put the following values in:

```
SSO session name (Recommended): sso-session
SSO start URL [None]: <USE VALUE OF SSO START URL FROM AWS LOGIN COMMAND LINE ACCESS INSTRUCTIONS ACCESSED FROM https://myapps.microsoft.com>
SSO region [None]: eu-west-2
SSO registration scopes [sso:account:access]:
```

This will then open a browser window and you should authenticate with your hscic credentials
You should then select the development account and set default region to be eu-west-2.

You will now be able to use AWS and SAM CLI commands to access the dev account. You can also use the AWS extension to view resources.

When the token expires, you may need to reauthorise using `make aws-login`

### CI Setup

The GitHub Actions require a secret to exist on the repo called "SONAR_TOKEN".
This can be obtained from [SonarCloud](https://sonarcloud.io/)
as described [here](https://docs.sonarsource.com/sonarqube/latest/user-guide/user-account/generating-and-using-tokens/).
You will need the "Execute Analysis" permission for the project (NHSDigital_electronic-prescription-service-clinical-prescription-tracker) in order for the token to work.


### Continuous deployment for testing

You can run the following command to deploy the code to AWS for testing

```
make sam-sync
```

This will take a few minutes to deploy - you will see something like this when deployment finishes

```
......
CloudFormation events from stack operations (refresh every 0.5 seconds)
---------------------------------------------------------------------------------------------------------------------------------------------------------------------
ResourceStatus                            ResourceType                              LogicalResourceId                         ResourceStatusReason
---------------------------------------------------------------------------------------------------------------------------------------------------------------------
.....
CREATE_IN_PROGRESS                        AWS::ApiGatewayV2::ApiMapping             HttpApiGatewayApiMapping                  -
CREATE_IN_PROGRESS                        AWS::ApiGatewayV2::ApiMapping             HttpApiGatewayApiMapping                  Resource creation Initiated
CREATE_COMPLETE                           AWS::ApiGatewayV2::ApiMapping             HttpApiGatewayApiMapping                  -
CREATE_COMPLETE                           AWS::CloudFormation::Stack                ab-1                                      -
---------------------------------------------------------------------------------------------------------------------------------------------------------------------


Stack creation succeeded. Sync infra completed.
```

Note - the command will keep running and should not be stopped.

Any code changes you make are automatically uploaded to AWS while `make sam-sync` is running allowing you to quickly test any changes you make

### Pre-commit hooks

Some pre-commit hooks are installed as part of the install above, to run basic lint checks and ensure you can't accidentally commit invalid changes.
The pre-commit hook uses python package pre-commit and is configured in the file .pre-commit-config.yaml.
A combination of these checks are also run in CI.

### Make commands

There are `make` commands that are run as part of the CI pipeline and help alias some functionality during development.

#### install targets

- `install-node` Installs node dependencies
- `install-python` Installs python dependencies
- `install-hooks` Installs git pre commit hooks
- `install` Runs all install targets

#### SAM targets

These are used to do common commands

- `sam-build` Prepares the lambdas and SAM definition file to be used in subsequent steps.
- `sam-run-local` Runs the API and lambdas locally.
- `sam-sync` Sync the API and lambda to AWS. This keeps running and automatically uploads any changes to lambda code made locally. Needs AWS_DEFAULT_PROFILE and stack_name environment variables set.
- `sam-sync-sandbox` Sync the API and lambda to AWS. This keeps running and automatically uploads any changes to lambda code made locally. Needs stack_name environment variables set, the path and file name where the AWS SAM template is located.
- `sam-deploy` Deploys the compiled SAM template from sam-build to AWS. Needs AWS_DEFAULT_PROFILE and stack_name environment variables set.
- `sam-delete` Deletes the deployed SAM cloud formation stack and associated resources. Needs AWS_DEFAULT_PROFILE and stack_name environment variables set.
- `sam-list-endpoints` Lists endpoints created for the current stack. Needs AWS_DEFAULT_PROFILE and stack_name environment variables set.
- `sam-list-resources` Lists resources created for the current stack. Needs AWS_DEFAULT_PROFILE and stack_name environment variables set.
- `sam-list-outputs` Lists outputs from the current stack. Needs AWS_DEFAULT_PROFILE and stack_name environment variables set.
- `sam-validate` Validates the main SAM template and the splunk firehose template.
- `sam-validate-sandbox` Validates the sandbox SAM template and the splunk firehose template.
- `sam-deploy-package` Deploys a package created by sam-build. Used in CI builds. Needs the following environment variables set.
  - artifact_bucket - bucket where uploaded packaged files are
  - artifact_bucket_prefix - prefix in bucket of where uploaded packaged files ore
  - stack_name - name of stack to deploy
  - template_file - name of template file created by sam-package
  - cloud_formation_execution_role - ARN of role that cloud formation assumes when applying the changeset

#### Clean and deep-clean targets

- `clean` Clears up any files that have been generated by building or testing locally.
- `deep-clean` Runs clean target and also removes any node_modules and python libraries installed locally.

#### Linting and testing

- `lint` Runs lint for all code
- `lint-node` Runs lint for node code
- `lint-cloudformation` Runs lint for cloudformation templates
- `lint-samtemplates` Runs lint for SAM templates
- `test` Runs unit tests for all code
- `cfn-guard` runs cfn-guard for sam and cloudformation templates

#### Compiling

- `compile` Compiles all code
- `compile-node` Runs tsc to compile typescript code

#### Check licenses

- `check-licenses` Checks licenses for all packages used - calls check-licenses-node, check-licenses-python
- `check-licenses-node` Checks licenses for all node code
- `check-licenses-python` Checks licenses for all python code

#### CLI Login to AWS

- `aws-configure` Configures a connection to AWS
- `aws-login` Reconnects to AWS from a previously configured connection

### Github folder

This .github folder contains workflows and templates related to GitHub, along with actions and scripts pertaining to Jira.

- `pull_request_template.yml` Template for pull requests.
- `dependabot.yml` Dependabot definition file.

Actions are in the `.github/actions` folder:

- `mark_jira_released` Action to mark Jira issues as released.
- `update_confluence_jira` Action to update Confluence with Jira issues.

Scripts are in the `.github/scripts` folder:

- `call_mark_jira_released.sh` Calls a Lambda function to mark Jira issues as released.
- `create_env_release_notes.sh` Generates release notes for a specific environment using a Lambda function.
- `create_int_rc_release_notes.sh` Creates release notes for integration environment using a Lambda function.
- `delete_stacks.sh` Checks and deletes active CloudFormation stacks associated with closed pull requests.
- `get_current_dev_tag.sh` Retrieves the current development tag and sets it as an environment variable.
- `get_target_deployed_tag.sh` Retrieves the currently deployed tag and sets it as an environment variable.
- `release_code.sh` Releases code by deploying it using AWS SAM after packaging it.

Workflows are in the `.github/workflows` folder:

- `combine-dependabot-prs.yml` Workflow for combining dependabot pull requests. Runs on demand.
- `delete_old_cloudformation_stacks.yml` Workflow for deleting old cloud formation stacks. Runs daily.
- `dependabot_auto_approve_and_merge.yml` Workflow to auto merge dependabot updates.
- `pr-link.yaml` This workflow template links Pull Requests to Jira tickets and runs when a pull request is opened.
- `pull_request.yml` Called when pull request is opened or updated. Calls sam_package_code and sam_release_code to build and deploy the code. Deploys to dev AWS account. The main stack deployed adopts the naming convention clinical-tracker-pr-<PULL_REQUEST_ID>, while the sandbox stack follows the pattern clinical-tracker-sandbox-pr-<PULL_REQUEST_ID>
- `quality_checks.yml` Runs check-licenses, lint, test and SonarCloud scan against the repo. Called from pull_request.yml and release.yml
- `release.yml` Run when code is merged to main branch or a tag starting v is pushed. Calls sam_package_code and sam_release_code to build and deploy the code.
- `sam_package_code.yml` Packages code and uploads to a github artifact for later deployment.
- `sam_release_code.yml` Release code built by sam_package_code.yml to an environment.
