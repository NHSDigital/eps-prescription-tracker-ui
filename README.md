# Electronic Prescription Service Clinical Prescription Tracker UI

![Build](https://github.com/NHSDigital/eps-prescription-tracker-uii/workflows/release/badge.svg?branch=main)

This is the code for the Clinical Prescription Tracker UI.

- `packages/cpt-ui` Client side react front end for clinical prescription tracker UI
- `packages/cdk/` Contains the cdk code used to define the stacks.
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

You will now be able to use AWS and CDK CLI commands to access the dev account. You can also use the AWS extension to view resources.

When the token expires, you may need to reauthorise using `make aws-login`

### Local Environment Configuration

To run the CPT UI locally (with mock auth and actual API usage), you can configure your `.envrc` file with a few variables. Below is an example configuration:

```
################
# UPDATE THESE #
################
export SERVICE_NAME=cpt-ui-pr-123
export VITE_userPoolClientId="1234567890deadbeef"
export VITE_userPoolId="eu-west-2_deadbeef"
export LOCAL_DEV=true

# DON'T TOUCH!
export VITE_TARGET_ENVIRONMENT=dev                                       # enables mock auth
export BASE_PATH="/site"                                                        # Hosts the site at `localhost:3000/site`
export API_DOMAIN_OVERRIDE=https://${SERVICE_NAME}.dev.eps.national.nhs.uk/     # Proxies the actual deployed backend for this PR

export VITE_hostedLoginDomain=${SERVICE_NAME}.auth.eu-west-2.amazoncognito.com
export VITE_redirectSignIn=http://localhost:3000/site/select-role
export VITE_redirectSignOut=http://localhost:3000/site/logout

export VITE_COMMIT_ID="Local Development Server"

export REACT_APP_hostedLoginDomain=$VITE_hostedLoginDomain
export REACT_APP_userPoolClientId=$VITE_userPoolClientId
export REACT_APP_userPoolId=$VITE_userPoolId
export REACT_APP_redirectSignIn=$VITE_redirectSignIn
export REACT_APP_redirectSignOut=$VITE_redirectSignOut
```

To enable mock auth for the local dev server, we only need the user pool details. To fetch these, you can use the following AWS CLI commands:

```
export PULL_REQUEST_ID=<PR NUMBER BY ITSELF>


export SERVICE_NAME=cpt-ui-pr-$PULL_REQUEST_ID
userPoolClientId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:userPoolClient:userPoolClientId'].Value" --output text)
userPoolId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:userPool:Id'].Value" --output text)
rumUnauthenticatedRumRoleArn=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:unauthenticatedRumRole:Arn'].Value" --output text)
rumIdentityPoolId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:identityPool:Id'].Value" --output text)
rumAppId=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:rumApp:Id'].Value" --output text)
rumAllowCookies=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:allowCookies'].Value" --output text)
rumEnableXRay=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:enableXRay'].Value" --output text)
rumSessionSampleRate=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:sessionSampleRate'].Value" --output text)
rumTelemetries=$(aws cloudformation list-exports --region eu-west-2 --query "Exports[?Name=='${SERVICE_NAME}-stateful-resources:rum:config:telemetries'].Value" --output text)

echo "*******************"
echo
echo "export VITE_userPoolClientId=\"$userPoolClientId\""
echo "export VITE_userPoolId=\"$userPoolId\""
echo "export VITE_RUM_GUEST_ROLE_ARN=\"$rumUnauthenticatedRumRoleArn\""
echo "export VITE_RUM_IDENTITY_POOL_ID=\"$rumIdentityPoolId\""
echo "export VITE_RUM_APPLICATION_ID=\"$rumAppId\""
echo "export VITE_RUM_ALLOW_COOKIES=\"$rumAllowCookies\""
echo "export VITE_RUM_ENABLE_XRAY=\"$rumEnableXRay\""
echo "export VITE_RUM_SESSION_SAMPLE_RATE=\"$rumSessionSampleRate\""
echo "export VITE_RUM_TELEMETRIES=\"$rumTelemetries\""

```

For me, the aws terminal console installed in the dev container refuses to work without causing a headache. Another approach is to use the browser console, accessed by clicking the terminal icon next to the search bar on the AWS web dashboard.

n.b. Ensure you've properly sourced these variables! `direnv` can sometimes miss changes on my machine.
```
source .envrc
```

###  React app
React/Next.js code resides in app folder.  More details to be added as dev progresses, see make section for relevant commands

### CI Setup

The GitHub Actions require a secret to exist on the repo called "SONAR_TOKEN".
This can be obtained from [SonarCloud](https://sonarcloud.io/)
as described [here](https://docs.sonarsource.com/sonarqube/latest/user-guide/user-account/generating-and-using-tokens/).
You will need the "Execute Analysis" permission for the project (NHSDigital_electronic-prescription-service-clinical-prescription-tracker) in order for the token to work.


### Continuous deployment for testing

You can run the following command to deploy the code to AWS for testing

```
make cdk-watch
```

This will take a few minutes to deploy - you will see a message saying deployment complete when it has finished.

Note - the command will keep running and should not be stopped.

Any code changes you make are automatically uploaded to AWS while `make cdk-watch` is running allowing you to quickly test any changes you make

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

#### CDK targets

These are used to do common commands related to cdk

- `cdk-deploy` Builds and deploys the code to AWS
- `cdk-synth` Converts the CDK code to cloudformation templates
- `cdk-diff` Runs cdk diff comparing the deployed stack with local CDK code to see differences
- `cdk-watch` Syncs the code and CDK templates to AWS. This keeps running and automatically uploads changes to AWS
- `build-deployment-container-image` Creates a container with all code necessary to run cdk deploy

#### Clean and deep-clean targets

- `clean` Clears up any files that have been generated by building or testing locally.
- `deep-clean` Runs clean target and also removes any node_modules and python libraries installed locally.

#### Linting and testing

- `lint` Runs lint for all code
- `lint-node` Runs lint for node code
- `test` Runs unit tests for all code
- `cfn-guard` runs cfn-guard for cloudformation templates generated by cdk synth

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

#### React App
- `react-dev` Starts app in dev mode on localhost
- `react-build` Generates static files in .next folder
- `react-start` Starts app in production mode using build-generated static files

### Github folder

This .github folder contains workflows and templates related to GitHub, along with actions and scripts pertaining to Jira.

- `pull_request_template.md` Template for pull requests.
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

Workflows are in the `.github/workflows` folder:

- `ci.yml` Workflow that runs on merges to main branch and releases to dev and qa environments.
- `delete_old_cloudformation_stacks.yml` Workflow for deleting old cloud formation stacks. Runs daily.
- `dependabot_auto_approve_and_merge.yml` Workflow to auto merge dependabot updates.
- `pr_title_check.yml` This workflow checks the pull request title has the correct format.
- `pr-link.yml` This workflow template links Pull Requests to Jira tickets and runs when a pull request is opened.
- `pull_request.yml` Called when pull request is opened or updated. Calls package_code and release_code to build and deploy the code. Deploys to dev AWS account. The main stack deployed adopts the naming convention cpt-ui-pr-<PULL_REQUEST_ID>
- `quality_checks.yml` Runs check-licenses, lint, test and SonarCloud scan against the repo. Called from pull_request.yml and release.yml
- `release.yml` Creates a new release tag and deploys to all environments
- `cdk_package_code.yml` Packages code into a docker image and uploads to a github artifact for later deployment.
- `cdk_release_code.yml` Release code built by cdk_package_code.yml to an environment.
