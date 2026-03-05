export CDK_CONFIG_stackName=${stack_name}
export CDK_CONFIG_versionNumber=undefined
export CDK_CONFIG_commitId=undefined
export CDK_CONFIG_isPullRequest=true # Turns off drift detection when true
export CDK_CONFIG_environment=dev
export CDK_CONFIG_allowAutoDeleteObjects=true
export CDK_CONFIG_cloudfrontDistributionId=123
export CDK_CONFIG_cloudfrontCertArn=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID
export CDK_CONFIG_shortCloudfrontDomain=dummy
export CDK_CONFIG_fullCloudfrontDomain=dummy.local
export CDK_CONFIG_epsDomainName=dummy.local
export CDK_CONFIG_fullCognitoDomain=dummy.local
export CDK_CONFIG_rumCloudwatchLogEnabled=true
export CDK_CONFIG_rumAppName=dummy
export CDK_CONFIG_epsHostedZoneId=123
export CDK_CONFIG_useMockOidc=false
export CDK_CONFIG_primaryOidcClientId=undefined
export CDK_CONFIG_primaryOidcIssuer=undefined
export CDK_CONFIG_primaryOidcAuthorizeEndpoint=undefined
export CDK_CONFIG_primaryOidcTokenEndpoint=undefined
export CDK_CONFIG_primaryOidcUserInfoEndpoint=undefined
export CDK_CONFIG_primaryOidcjwksEndpoint=undefined
export CDK_CONFIG_mockOidcClientId=undefined
export CDK_CONFIG_mockOidcIssuer=undefined
export CDK_CONFIG_mockOidcAuthorizeEndpoint=undefined
export CDK_CONFIG_mockOidcTokenEndpoint=undefined
export CDK_CONFIG_mockOidcUserInfoEndpoint=undefined
export CDK_CONFIG_mockOidcjwksEndpoint=undefined
export CDK_CONFIG_apigeeApiKey=foo
export CDK_CONFIG_apigeeApiSecret=foo
export CDK_CONFIG_apigeeDoHSApiKey=foo
export CDK_CONFIG_apigeeCIS2TokenEndpoint=foo
export CDK_CONFIG_apigeePrescriptionsEndpoint=foo
export CDK_CONFIG_apigeePersonalDemographicsEndpoint=foo
export CDK_CONFIG_apigeeDoHSEndpoint=foo
export CDK_CONFIG_webAclAttributeArn=foo
export CDK_CONFIG_logRetentionInDays=30
export CDK_CONFIG_logLevel=debug
export CDK_CONFIG_jwtKid=foo
export CDK_CONFIG_roleId=foo
export CDK_CONFIG_useCustomCognitoDomain=true
export CDK_CONFIG_allowLocalhostAccess=false
export CDK_CONFIG_wafAllowGaRunnerConnectivity=true
export CDK_CONFIG_githubAllowListIpv4='["127.0.0.1"]'
export CDK_CONFIG_githubAllowListIpv6='["::1"]'
export CDK_CONFIG_cloudfrontOriginCustomHeader=foo
export CDK_CONFIG_splunkDeliveryStream=foo
export CDK_CONFIG_splunkSubscriptionFilterRole=foo
export CDK_CONFIG_useZoneApex=false
export CDK_CONFIG_forwardCsocLogs=true

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

.PHONY: install compile test publish release clean lint

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

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-githubaction-scripts react-lint

test: compile
	npm run test --workspace packages/cloudfrontFunctions
	npm run test --workspace packages/cdk
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

cdk-deploy: guard-service_name guard-CDK_APP_NAME
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	npm run cdk-deploy --workspace packages/cdk

cdk-watch:
	./scripts/run_sync.sh

cdk-synth: compile cdk-synth-no-mock cdk-synth-mock

cdk-synth-no-mock: cdk-synth-stateful-resources-no-mock cdk-synth-stateless-resources-no-mock

cdk-synth-mock: cdk-synth-stateful-resources-mock cdk-synth-stateless-resources-mock

cdk-synth-stateful-resources-no-mock:
	CDK_APP_NAME=StatefulResourcesApp \
	CDK_CONFIG_useMockOidc=false \
	CDK_CONFIG_stackName=cpt-ui \
	npm run cdk-synth --workspace packages/cdk

cdk-synth-stateless-resources-no-mock:
	CDK_APP_NAME=StatelessResourcesApp \
	CDK_CONFIG_useMockOidc=false \
	CDK_CONFIG_stackName=cpt-ui \
	npm run cdk-synth --workspace packages/cdk


cdk-synth-stateful-resources-mock:
	CDK_APP_NAME=StatefulResourcesApp \
	CDK_CONFIG_useMockOidc=true \
	CDK_CONFIG_stackName=cpt-ui \
	npm run cdk-synth --workspace packages/cdk

cdk-synth-stateless-resources-mock:
	CDK_APP_NAME=StatelessResourcesApp \
	CDK_CONFIG_useMockOidc=true \
	CDK_CONFIG_stackName=cpt-ui \
	npm run cdk-synth --workspace packages/cdk

cdk-diff: guard-CDK_APP_NAME
	npm run cdk-diff --workspace packages/cdk

build-deployment-container-image:
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .

%:
	@$(MAKE) -f /usr/local/share/eps/Mk/common.mk $@
