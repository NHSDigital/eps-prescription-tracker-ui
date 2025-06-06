# Electronic Prescription Service Clinical Prescription Tracker UI
# trigger build

![Build](https://github.com/NHSDigital/eps-prescription-tracker-uii/workflows/release/badge.svg?branch=main)

This is the code for the Clinical Prescription Tracker UI.

- `packages/cpt-ui` Client side react front end for clinical prescription tracker UI
- `packages/cdk/` Contains the cdk code used to define the stacks.
- `packages/cloudfrontFunctions/` Functions used to modify the requests and responses in CloudFront.
- `packages/staticContent/` Static content used by the website.
- `packages/cognito/` Lambda function used by cognito
- `packages/CIS2SignOutLambda/` Lambda function used by CIS2 to sign out users
- `packages/prescriptionListLambda/` Lambda function used to list prescriptions
- `packages/patientSearchLambda/` Lambda function used to search for patients
- `packages/common/middyErrorHandler/` Common error handler used by the lambda functions
- `packages/common/pdsClient/` Common PDS client used by the lambda functions
- `packages/common/commonTypes/` Common types used throughout the lambda functions
- `packages/common/lambdaUtils/` Common utils used by the lambda functions
- `packages/common/testing/` Common testing utils used by the lambda functions
- `packages/common/authFunctions/` Common auth functions used by the lambda functions
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
```

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

### Running website locally and syncing CDK

To speed up feedback time during development, you can run the website locally and automatically sync any cdk changes automatically to AWS.  
You must have already created a pull request for your branch to set up the initial CDK infrastructure.

Once this is done, you can run
```
make cdk-watch
```
and enter the pull request id (just the number)
Log files are written to at
- .local_config/stateful_app.log
- .local_config/stateless_app.log
- .local_config/website.log

You should monitor the stateful and stateless log files as it can take a few minutes for the sync to complete.   
This runs cdk watch against the stateless and stateful stacks, and also starts the website running locally which you can access at http://localhost:3000


###  React app
React code resides in packages/cpt-ui folder.  

### CI Setup

The GitHub Actions require a secret to exist on the repo called "SONAR_TOKEN".
This can be obtained from [SonarCloud](https://sonarcloud.io/)
as described [here](https://docs.sonarsource.com/sonarqube/latest/user-guide/user-account/generating-and-using-tokens/).
You will need the "Execute Analysis" permission for the project (NHSDigital_electronic-prescription-service-clinical-prescription-tracker) in order for the token to work.

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
- `cdk-watch` Syncs the code and CDK templates to AWS, and starts local webserver. This keeps running and automatically uploads changes to AWS

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
