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
	npx tsc --build tsconfig.build.json

compile: compile-node

lint-node: compile-node
	npm run lint --workspace packages/cdk

lint-githubactions:
	actionlint

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-samtemplates lint-githubactions lint-githubaction-scripts react-lint

lint: lint-node lint-githubactions lint-githubaction-scripts react-lint

test: compile
	npm run test --workspace packages/cdk

clean:
	rm -rf cdk.out
	rm -rf cfn_guard_output
	rm -rf packages/cpt-ui/.next

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

check-licenses: check-licenses-node check-licenses-python

check-licenses-node:
	npm run check-licenses
	npm run check-licenses --workspace packages/cdk
	npm run check-licenses --workspace packages/cpt-ui

check-licenses-python:
	scripts/check_python_licenses.sh

aws-configure:
	aws configure sso --region eu-west-2

aws-login:
	aws sso login --sso-session sso-session

cfn-guard:
	./scripts/run_cfn_guard.sh

build-localsite:
	npm run build --workspace packages/auth-demo

run-auth:
	npm run start --workspace packages/auth-demo
react-dev:
	npm run dev --workspace packages/cpt-ui

react-build:
	npm run build --workspace packages/cpt-ui

react-start:
	npm run start --workspace packages/cpt-ui

react-lint:
	npm run lint --workspace packages/cpt-ui

cdk-deploy: guard-stack_name
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	VERSION_NUMBER="$${VERSION_NUMBER:-undefined}" && \
	COMMIT_ID="$${COMMIT_ID:-undefined}" && \
		npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--all \
		--ci true \
		--require-approval $${REQUIRE_APPROVAL} \
		--context stackName=$$stack_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID \
		--context primaryOidcClientId=$$Auth0ClientID \
		--context primaryOidClientSecret=$$Auth0ClientSecret \
		--context primaryOidcIssuer=$$Auth0Issuer \
		--context primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--context primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--context primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--context primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--context epsDomain=$$epsDomain \
		--context epsZoneId=$$epsZoneId 

cdk-synth-mock:
	npx cdk synth \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--context stackName=cpt-ui \
		--context VERSION_NUMBER=undefined \
		--context COMMIT_ID=undefined \
		--context primaryOidcClientId=$$Auth0ClientID \
		--context primaryOidClientSecret=$$Auth0ClientSecret \
		--context primaryOidcIssuer=$$Auth0Issuer \
		--context primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--context primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--context primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--context primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--context mockOidcClientId=$$Auth0ClientID \
		--context mockOidClientSecret=$$Auth0ClientSecret \
		--context mockOidcIssuer=$$Auth0Issuer \
		--context mockOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--context mockOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--context mockOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--context mockOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--context epsDomain=$$epsDomain \
		--context epsZoneId=$$epsZoneId \
		--context useMockOidc=true

cdk-synth-no-mock:
	npx cdk synth \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--context stackName=cpt-ui \
		--context VERSION_NUMBER=undefined \
		--context COMMIT_ID=undefined \
		--context primaryOidcClientId=$$Auth0ClientID \
		--context primaryOidClientSecret=$$Auth0ClientSecret \
		--context primaryOidcIssuer=$$Auth0Issuer \
		--context primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--context primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--context primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--context primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--context epsDomain=$$epsDomain \
		--context epsZoneId=$$epsZoneId

cdk-synth: cdk-synth-no-mock cdk-synth-mock

cdk-diff:
	npx cdk diff \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--context stackName=$$stack_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID \
		--context primaryOidcClientId=$$Auth0ClientID \
		--context primaryOidClientSecret=$$Auth0ClientSecret \
		--context primaryOidcIssuer=$$Auth0Issuer \
		--context primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--context primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--context primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--context primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--context epsDomain=$$epsDomain \
		--context epsZoneId=$$epsZoneId 

cdk-watch: guard-stack_name
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	VERSION_NUMBER="$${VERSION_NUMBER:-undefined}" && \
	COMMIT_ID="$${COMMIT_ID:-undefined}" && \
		npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--watch \
		--all \
		--ci true \
		--require-approval $${REQUIRE_APPROVAL} \
		--context stackName=$$stack_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID \
		--context primaryOidcClientId=$$Auth0ClientID \
		--context primaryOidClientSecret=$$Auth0ClientSecret \
		--context primaryOidcIssuer=$$Auth0Issuer \
		--context primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--context primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--context primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--context primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--context epsDomain=$$epsDomain \
		--context epsZoneId=$$epsZoneId 


build-deployment-container-image:
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .
