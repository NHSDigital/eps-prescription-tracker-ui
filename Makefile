guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

.PHONY: install build test publish release clean

install: install-node install-python install-hooks

install-python:
	poetry install

install-node:
	npm ci

install-hooks: install-python
	poetry run pre-commit install --install-hooks --overwrite

compile-node:
	npm run compile --workspace packages/common/commonTypes
	npm run compile --workspace packages/common/middyErrorHandler
	npm run compile --workspace packages/common/authFunctions
	npx tsc --build tsconfig.build.json

compile: compile-node

lint-node: compile-node
	npm run lint --workspace packages/common/commonTypes
	npm run lint --workspace packages/cloudfrontFunctions
	npm run lint --workspace packages/cdk
	npm run lint --workspace packages/cognito
	npm run lint --workspace packages/prescriptionListLambda
	npm run lint --workspace packages/common/testing
	npm run lint --workspace packages/common/middyErrorHandler
	npm run lint --workspace packages/trackerUserInfoLambda
	npm run lint --workspace packages/selectedRoleLambda
	npm run lint --workspace packages/CIS2SignOutLambda
	npm run lint --workspace packages/common/authFunctions

lint-githubactions:
	actionlint

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-githubactions lint-githubaction-scripts react-lint

test: compile
	npm run test --workspace packages/cloudfrontFunctions
	npm run test --workspace packages/cdk
	npm run test --workspace packages/cpt-ui
	npm run test --workspace packages/cognito
	npm run test --workspace packages/prescriptionListLambda
	npm run test --workspace packages/common/middyErrorHandler
	npm run test --workspace packages/trackerUserInfoLambda
	npm run test --workspace packages/selectedRoleLambda
	npm run test --workspace packages/CIS2SignOutLambda
	npm run test --workspace packages/common/authFunctions

clean:
	rm -rf packages/common/commonTypes/coverage
	rm -rf packages/common/commonTypes/lib
	rm -rf packages/cloudfrontFunctions/coverage
	rm -rf packages/cloudfrontFunctions/lib
	rm -rf packages/cdk/coverage
	rm -rf packages/cdk/lib
	rm -rf packages/cognito/coverage
	rm -rf packages/cognito/lib
	rm -rf packages/prescriptionListLambda/coverage
	rm -rf packages/prescriptionListLambda/lib
	rm -rf packages/common/middyErrorHandler/coverage
	rm -rf packages/common/middyErrorHandler/lib
	rm -rf cdk.out
	rm -rf packages/cpt-ui/.next
	rm -rf packages/auth_demo/build
	rm -rf packages/trackerUserInfoLambda/coverage
	rm -rf packages/trackerUserInfoLambda/lib
	rm -rf packages/selectedRoleLambda/coverage
	rm -rf packages/selectedRoleLambda/lib
	rm -rf packages/common/authFunctions/coverage
	rm -rf packages/common/authFunctions/lib
	rm -rf packages/CIS2SignOutLambda/coverage
	rm -rf packages/CIS2SignOutLambda/lib

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

check-licenses: check-licenses-node check-licenses-python

check-licenses-node:
	npm run check-licenses
	npm run check-licenses --workspace packages/common/commonTypes
	npm run check-licenses --workspace packages/cloudfrontFunctions
	npm run check-licenses --workspace packages/cdk
	npm run check-licenses --workspace packages/cpt-ui
	npm run check-licenses --workspace packages/common/authFunctions
	npm run check-licenses --workspace packages/cognito
	npm run check-licenses --workspace packages/prescriptionListLambda
	npm run check-licenses --workspace packages/trackerUserInfoLambda
	npm run check-licenses --workspace packages/selectedRoleLambda
	npm run check-licenses --workspace packages/CIS2SignOutLambda

check-licenses-python:
	scripts/check_python_licenses.sh

aws-configure:
	aws configure sso --region eu-west-2

aws-login:
	aws sso login --sso-session sso-session

cfn-guard:
	./scripts/run_cfn_guard.sh

react-dev:
	npm run dev --workspace packages/cpt-ui

react-build:
	export BASE_PATH=/site && npm run build --workspace packages/cpt-ui

react-start:
	 npm run start --workspace packages/cpt-ui

react-lint:
	npm run lint --workspace packages/cpt-ui

auth_demo_build:
	export PUBLIC_URL="/auth_demo" && npm run build --workspace packages/auth_demo/

cdk-deploy: guard-service_name guard-CDK_APP_NAME
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	VERSION_NUMBER="$${VERSION_NUMBER:-undefined}" && \
	COMMIT_ID="$${COMMIT_ID:-undefined}" && \
		npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--all \
		--ci true \
		--require-approval $${REQUIRE_APPROVAL} \
		--context serviceName=$$service_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID

cdk-watch:
	./scripts/run_sync.sh

cdk-synth: cdk-synth-no-mock cdk-synth-mock

cdk-synth-no-mock: cdk-synth-stateful-resources-no-mock cdk-synth-stateless-resources-no-mock

cdk-synth-mock: cdk-synth-stateful-resources-mock cdk-synth-stateless-resources-mock

cdk-synth-stateful-resources-no-mock:
	mkdir -p .local_config
	CDK_APP_NAME=StatefulResourcesApp \
	SERVICE_NAME=cpt-ui \
	VERSION_NUMBER=undefined \
	COMMIT_ID=undefined \
	AUTO_DELETE_OBJECTS=true \
	CLOUDFRONT_DISTRIBUTION_ID=123 \
	CLOUDFRONT_CERT_ARN=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID \
	SHORT_CLOUDFRONT_DOMAIN=dummy \
	FULL_CLOUDFRONT_DOMAIN=dummy.local \
	EPS_DOMAIN_NAME=dummy.local \
	FULL_COGNITO_DOMAIN=dummy.local \
	RUM_LOG_GROUP_ARN=123 \
	RUM_APP_NAME=dummy \
	EPS_HOSTED_ZONE_ID=123 \
	USE_MOCK_OIDC=false \
	PRIMARY_OIDC_CLIENT_ID=undefined \
	PRIMARY_OIDC_ISSUER=undefined \
	PRIMARY_OIDC_AUTHORIZE_ENDPOINT=undefined \
	PRIMARY_OIDC_TOKEN_ENDPOINT=undefined \
	PRIMARY_OIDC_USERINFO_ENDPOINT=undefined \
	PRIMARY_OIDC_JWKS_ENDPOINT=undefined \
	LOG_RETENTION_IN_DAYS=30 \
	LOG_LEVEL=debug \
	USE_CUSTOM_COGNITO_DOMAIN=true \
	ALLOW_LOCALHOST_ACCESS=false \
	DO_NOT_GET_AWS_EXPORT=true \
		 ./.github/scripts/fix_cdk_json.sh .local_config/stateful_app.config.json
	CONFIG_FILE_NAME=.local_config/stateful_app.config.json npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatefulResourcesApp.ts" 

cdk-synth-stateless-resources-no-mock:
	mkdir -p .local_config
	CDK_APP_NAME=StatelessResourcesApp \
	SERVICE_NAME=cpt-ui \
	VERSION_NUMBER=undefined \
	COMMIT_ID=undefined \
	AUTO_DELETE_OBJECTS=true \
	LOG_RETENTION_IN_DAYS=30 \
	LOG_LEVEL=debug \
	EPS_DOMAIN_NAME=dummy.local \
	EPS_HOSTED_ZONE_ID=123 \
	CLOUDFRONT_DISTRIBUTION_ID=123 \
	SHORT_CLOUDFRONT_DOMAIN=dummy \
	FULL_CLOUDFRONT_DOMAIN=dummy.local \
	FULL_COGNITO_DOMAIN=dummy.local \
	RUM_LOG_GROUP_ARN=123 \
	RUM_APP_NAME=dummy \
	PRIMARY_OIDC_CLIENT_ID=undefined \
	PRIMARY_OIDC_ISSUER=undefined \
	PRIMARY_OIDC_AUTHORIZE_ENDPOINT=undefined \
	PRIMARY_OIDC_TOKEN_ENDPOINT=undefined \
	PRIMARY_OIDC_USERINFO_ENDPOINT=undefined \
	PRIMARY_OIDC_JWKS_ENDPOINT=undefined \
	USE_MOCK_OIDC=false \
	APIGEE_API_KEY=foo \
	APIGEE_CIS2_TOKEN_ENDPOINT=foo \
	APIGEE_PRESCRIPTION_ENDPOINT=foo \
	APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT=foo \
	JWT_KID=foo \
	ROLE_ID=foo \
	ALLOW_LOCALHOST_ACCESS=false \
	CLOUDFRONT_CERT_ARN=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID \
	DO_NOT_GET_AWS_EXPORT=true \
		 ./.github/scripts/fix_cdk_json.sh .local_config/stateless_app.config.json
	CONFIG_FILE_NAME=.local_config/stateless_app.config.json npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatelessResourcesApp.ts" 

cdk-synth-stateful-resources-mock:
	mkdir -p .local_config
	CDK_APP_NAME=StatefulResourcesApp \
	SERVICE_NAME=cpt-ui \
	VERSION_NUMBER=undefined \
	COMMIT_ID=undefined \
	AUTO_DELETE_OBJECTS=true \
	CLOUDFRONT_DISTRIBUTION_ID=123 \
	CLOUDFRONT_CERT_ARN=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID \
	SHORT_CLOUDFRONT_DOMAIN=dummy \
	FULL_CLOUDFRONT_DOMAIN=dummy.local \
	EPS_DOMAIN_NAME=dummy.local \
	FULL_COGNITO_DOMAIN=dummy.local \
	RUM_LOG_GROUP_ARN=123 \
	RUM_APP_NAME=dummy \
	EPS_HOSTED_ZONE_ID=123 \
	USE_MOCK_OIDC=true \
	PRIMARY_OIDC_CLIENT_ID=undefined \
	PRIMARY_OIDC_ISSUER=undefined \
	PRIMARY_OIDC_AUTHORIZE_ENDPOINT=undefined \
	PRIMARY_OIDC_TOKEN_ENDPOINT=undefined \
	PRIMARY_OIDC_USERINFO_ENDPOINT=undefined \
	PRIMARY_OIDC_JWKS_ENDPOINT=undefined \
	MOCK_OIDC_CLIENT_ID=undefined \
	MOCK_OIDC_ISSUER=undefined \
	MOCK_OIDC_AUTHORIZE_ENDPOINT=undefined \
	MOCK_OIDC_TOKEN_ENDPOINT=undefined \
	MOCK_OIDC_USERINFO_ENDPOINT=undefined \
	MOCK_OIDC_JWKS_ENDPOINT=undefined \
	LOG_RETENTION_IN_DAYS=30 \
	LOG_LEVEL=debug \
	USE_CUSTOM_COGNITO_DOMAIN=true \
	ALLOW_LOCALHOST_ACCESS=false \
	DO_NOT_GET_AWS_EXPORT=true \
		 ./.github/scripts/fix_cdk_json.sh .local_config/stateful_app.config.json
	CONFIG_FILE_NAME=.local_config/stateful_app.config.json npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatefulResourcesApp.ts" 

cdk-synth-stateless-resources-mock:
	mkdir -p .local_config
	CDK_APP_NAME=StatelessResourcesApp \
	SERVICE_NAME=cpt-ui \
	VERSION_NUMBER=undefined \
	COMMIT_ID=undefined \
	AUTO_DELETE_OBJECTS=true \
	LOG_RETENTION_IN_DAYS=30 \
	LOG_LEVEL=debug \
	EPS_DOMAIN_NAME=dummy.local \
	EPS_HOSTED_ZONE_ID=123 \
	CLOUDFRONT_DISTRIBUTION_ID=123 \
	SHORT_CLOUDFRONT_DOMAIN=dummy \
	FULL_CLOUDFRONT_DOMAIN=dummy.local \
	FULL_COGNITO_DOMAIN=dummy.local \
	RUM_LOG_GROUP_ARN=123 \
	RUM_APP_NAME=dummy \
	PRIMARY_OIDC_CLIENT_ID=undefined \
	PRIMARY_OIDC_ISSUER=undefined \
	PRIMARY_OIDC_AUTHORIZE_ENDPOINT=undefined \
	PRIMARY_OIDC_TOKEN_ENDPOINT=undefined \
	PRIMARY_OIDC_USERINFO_ENDPOINT=undefined \
	PRIMARY_OIDC_JWKS_ENDPOINT=undefined \
	MOCK_OIDC_CLIENT_ID=undefined \
	MOCK_OIDC_ISSUER=undefined \
	MOCK_OIDC_AUTHORIZE_ENDPOINT=undefined \
	MOCK_OIDC_TOKEN_ENDPOINT=undefined \
	MOCK_OIDC_USERINFO_ENDPOINT=undefined \
	MOCK_OIDC_JWKS_ENDPOINT=undefined \
	USE_MOCK_OIDC=true \
	APIGEE_API_KEY=foo \
	APIGEE_CIS2_TOKEN_ENDPOINT=foo \
	APIGEE_MOCK_TOKEN_ENDPOINT=foo \
	APIGEE_PRESCRIPTION_ENDPOINT=foo \
	APIGEE_PERSONAL_DEMOGRAPHICS_ENDPOINT=foo \
	JWT_KID=foo \
	ROLE_ID=foo \
	ALLOW_LOCALHOST_ACCESS=false \
	CLOUDFRONT_CERT_ARN=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID \
	DO_NOT_GET_AWS_EXPORT=true \
		 ./.github/scripts/fix_cdk_json.sh .local_config/stateless_app.config.json
	CONFIG_FILE_NAME=.local_config/stateless_app.config.json npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatelessResourcesApp.ts" 

cdk-diff: guard-CDK_APP_NAME
	npx cdk diff \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--context serviceName=$$service_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID

build-deployment-container-image:
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .
