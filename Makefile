export CDK_APP_NAME=MainDeploymentApp
export CDK_CONFIG_serviceName=${stack_name}
export CDK_CONFIG_versionNumber=undefined
export CDK_CONFIG_commitId=undefined
export CDK_CONFIG_isPullRequest=true # Turns off drift detection when true
export CDK_CONFIG_environment=dev
export CDK_CONFIG_rumCloudwatchLogEnabled=true
export CDK_CONFIG_useMockOidc=false
export CDK_CONFIG_primaryOidcClientId=undefined
export CDK_CONFIG_mockOidcClientId=undefined
export CDK_CONFIG_logRetentionInDays=30
export CDK_CONFIG_logLevel=debug
export CDK_CONFIG_reactLogLevel=debug
export CDK_CONFIG_jwtKid=foo
export CDK_CONFIG_cloudfrontOriginCustomHeader=foo

.PHONY: install compile test publish release clean lint cdk-synth

install: install-node install-python install-hooks

install-python:
	poetry install

install-node:
	npm ci

install-hooks: install-python
	poetry run pre-commit install --install-hooks --overwrite

compile-node:
	npx tsc --build tsconfig.build.json

compile: compile-node

lint-node: compile-node
	npm run lint --workspace packages/common/commonTypes
	npm run lint --workspace packages/cloudfrontFunctions
	npm run lint --workspace packages/cdk
	npm run lint --workspace packages/cognito
	npm run lint --workspace packages/prescriptionListLambda
	npm run lint --workspace packages/prescriptionDetailsLambda
	npm run lint --workspace packages/patientSearchLambda
	npm run lint --workspace packages/common/testing
	npm run lint --workspace packages/common/middyErrorHandler
	npm run lint --workspace packages/common/pdsClient
	npm run lint --workspace packages/common/lambdaUtils
	npm run lint --workspace packages/trackerUserInfoLambda
	npm run lint --workspace packages/sessionManagementLambda
	npm run lint --workspace packages/selectedRoleLambda
	npm run lint --workspace packages/CIS2SignOutLambda
	npm run lint --workspace packages/common/authFunctions
	npm run lint --workspace packages/common/doHSClient
	npm run lint --workspace packages/common/dynamoFunctions
	npm run lint --workspace packages/testingSupport/clearActiveSessions
	npm run lint --workspace packages/testingSupport/setLastActivityTime

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-githubaction-scripts react-lint

test: compile
	npm run test --workspace packages/cloudfrontFunctions
	npm run test --workspace packages/cpt-ui
	npm run test --workspace packages/cognito
	npm run test --workspace packages/prescriptionListLambda
	npm run test --workspace packages/prescriptionDetailsLambda
	npm run test --workspace packages/patientSearchLambda
	npm run test --workspace packages/common/middyErrorHandler
	npm run test --workspace packages/common/pdsClient
	npm run test --workspace packages/common/lambdaUtils
	npm run test --workspace packages/trackerUserInfoLambda
	npm run test --workspace packages/sessionManagementLambda
	npm run test --workspace packages/selectedRoleLambda
	npm run test --workspace packages/CIS2SignOutLambda
	npm run test --workspace packages/common/authFunctions
	npm run test --workspace packages/common/doHSClient
	npm run test --workspace packages/common/dynamoFunctions
	npm run test --workspace packages/testingSupport/clearActiveSessions
	npm run test --workspace packages/testingSupport/setLastActivityTime

clean:
	find . -name 'coverage' -type d -prune -exec rm -rf '{}' +
	find . -name 'lib' -type d -prune -exec rm -rf '{}' +
	rm -rf cdk.out
	rm -rf .local_config

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

aws-configure:
	aws configure sso --region eu-west-2

aws-login:
	aws sso login --sso-session sso-session

react-dev:
	npm run dev --workspace packages/cpt-ui

react-build:
	export BASE_PATH=/site && npm run build --workspace packages/cpt-ui

react-start:
	 npm run start --workspace packages/cpt-ui

react-lint:
	npm run lint --workspace packages/cpt-ui

cdk-deploy:
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	npm run cdk-deploy --workspace packages/cdk

cdk-watch:
	./scripts/run_sync.sh

cdk-synth: compile cdk-synth-no-mock cdk-synth-mock

cdk-synth-no-mock:
	CDK_CONFIG_useMockOidc=false \
	CDK_CONFIG_serviceName="cpt-ui" \
	DO_NOT_GET_AWS_EXPORT=true \
	npm run cdk-synth --workspace packages/cdk

cdk-synth-mock:
	CDK_CONFIG_useMockOidc=true \
	CDK_CONFIG_serviceName="cpt-ui" \
	DO_NOT_GET_AWS_EXPORT=true \
	npm run cdk-synth --workspace packages/cdk

%:
	@$(MAKE) -f /usr/local/share/eps/Mk/common.mk $@
