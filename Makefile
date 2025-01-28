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
	npm run compile --workspace packages/common/middyErrorHandler
	npm run compile --workspace packages/common/authFunctions
	npx tsc --build tsconfig.build.json

compile: compile-node

lint-node: compile-node
	npm run lint --workspace packages/cloudfrontFunctions
	npm run lint --workspace packages/cdk
	npm run lint --workspace packages/cognito
	npm run lint --workspace packages/prescriptionSearchLambda
	npm run lint --workspace packages/common/testing
	npm run lint --workspace packages/common/middyErrorHandler
	npm run lint --workspace packages/trackerUserInfoLambda
	npm run lint --workspace packages/selectedRoleLambda
	npm run lint --workspace packages/common/authFunctions

lint-githubactions:
	actionlint

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-githubactions lint-githubaction-scripts react-lint

test: compile
	npm run test --workspace packages/cloudfrontFunctions
	npm run test --workspace packages/cdk
	# npm run test --workspace packages/cpt-ui
	npm run test --workspace packages/cognito
	npm run test --workspace packages/prescriptionSearchLambda
	npm run test --workspace packages/common/middyErrorHandler
	npm run test --workspace packages/trackerUserInfoLambda
	npm run test --workspace packages/selectedRoleLambda
	npm run test --workspace packages/common/authFunctions

clean:
	rm -rf packages/cloudfrontFunctions/coverage
	rm -rf packages/cloudfrontFunctions/lib
	rm -rf packages/cdk/coverage
	rm -rf packages/cdk/lib
	rm -rf packages/cognito/coverage
	rm -rf packages/cognito/lib
	rm -rf packages/prescriptionSearchLambda/coverage
	rm -rf packages/prescriptionSearchLambda/lib
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

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

check-licenses: check-licenses-node check-licenses-python

check-licenses-node:
	npm run check-licenses
	npm run check-licenses --workspace packages/cloudfrontFunctions
	npm run check-licenses --workspace packages/cdk
	npm run check-licenses --workspace packages/cpt-ui
	npm run check-licenses --workspace packages/common/authFunctions
	npm run check-licenses --workspace packages/cognito
	npm run check-licenses --workspace packages/prescriptionSearchLambda
	npm run check-licenses --workspace packages/trackerUserInfoLambda
	npm run check-licenses --workspace packages/selectedRoleLambda

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
	export NEXT_OUTPUT_MODE=export && export BASE_PATH=/site && npm run build --workspace packages/cpt-ui

react-start:
	unset NEXT_OUTPUT_MODE && npm run start --workspace packages/cpt-ui

react-lint:
	# npm run lint --workspace packages/cpt-ui

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

cdk-synth: cdk-synth-no-mock cdk-synth-mock

cdk-synth-no-mock: cdk-synth-stateful-resources-no-mock cdk-synth-stateless-resources-no-mock

cdk-synth-mock: cdk-synth-stateful-resources-mock cdk-synth-stateless-resources-mock

cdk-synth-stateful-resources-no-mock:
	npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatefulResourcesApp.ts" \
		--context serviceName=cpt-ui \
		--context VERSION_NUMBER=undefined \
		--context COMMIT_ID=undefined \
		--context allowAutoDeleteObjects=true \
		--context cloudfrontDistributionId=undefined \
		--context epsDomainName=undefined \
		--context epsHostedZoneId=undefined

cdk-synth-stateless-resources-no-mock:
	npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatelessResourcesApp.ts" \
		--context serviceName=cpt-ui \
		--context VERSION_NUMBER=undefined \
		--context COMMIT_ID=undefined \
		--context logRetentionInDays=30 \
		--context LogLevel=debug \
		--context epsDomainName=undefined \
		--context epsHostedZoneId=undefined \
		--context cloudfrontCertArn=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID \

cdk-synth-stateful-resources-mock:
	npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatefulResourcesApp.ts" \
		--context serviceName=cpt-ui \
		--context VERSION_NUMBER=undefined \
		--context COMMIT_ID=undefined \
		--context allowAutoDeleteObjects=true \
		--context cloudfrontDistributionId=undefined \
		--context epsDomainName=undefined \
		--context epsHostedZoneId=undefined \
		--context useMockOidc=true \
		--context primaryOidcClientId=undefined \
		--context primaryOidcIssuer=undefined \
		--context primaryOidcAuthorizeEndpoint=undefined \
		--context primaryOidcTokenEndpoint=undefined \
		--context primaryOidcUserInfoEndpoint=undefined \
		--context primaryOidcjwksEndpoint=undefined \
		--context mockOidcClientId=undefined \
		--context mockOidcIssuer=undefined \
		--context mockOidcAuthorizeEndpoint=undefined \
		--context mockOidcTokenEndpoint=undefined \
		--context mockOidcUserInfoEndpoint=undefined \
		--context mockOidcjwksEndpoint=undefined \
		--context shortCloudfrontDomain=undefined \
		--context fullCloudfrontDomain=undefined


cdk-synth-stateless-resources-mock:
	npx cdk synth \
		--quiet \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/StatelessResourcesApp.ts" \
		--context serviceName=cpt-ui \
		--context VERSION_NUMBER=undefined \
		--context COMMIT_ID=undefined \
		--context logRetentionInDays=30 \
		--context LogLevel=debug \
		--context epsDomainName=undefined \
		--context epsHostedZoneId=undefined \
		--context cloudfrontCertArn=arn:aws:acm:us-east-1:444455556666:certificate/certificate_ID \
		--context useMockOidc=true \
		--context primaryOidcClientId=undefined \
		--context primaryOidcIssuer=undefined \
		--context primaryOidcAuthorizeEndpoint=undefined \
		--context primaryOidcTokenEndpoint=undefined \
		--context primaryOidcUserInfoEndpoint=undefined \
		--context primaryOidcjwksEndpoint=undefined \
		--context mockOidcClientId=undefined \
		--context mockOidcIssuer=undefined \
		--context mockOidcAuthorizeEndpoint=undefined \
		--context mockOidcTokenEndpoint=undefined \
		--context mockOidcUserInfoEndpoint=undefined \
		--context mockOidcjwksEndpoint=undefined \
		--context shortCloudfrontDomain=undefined \
		--context fullCloudfrontDomain=undefined

cdk-diff: guard-CDK_APP_NAME
	npx cdk diff \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--context serviceName=$$service_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID

cdk-watch: guard-service_name guard-CDK_APP_NAME
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	VERSION_NUMBER="$${VERSION_NUMBER:-undefined}" && \
	COMMIT_ID="$${COMMIT_ID:-undefined}" && \
		npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--watch \
		--all \
		--ci true \
		--require-approval $${REQUIRE_APPROVAL} \
		--context serviceName=$$service_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID


build-deployment-container-image:
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .
