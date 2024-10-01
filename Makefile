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

sam-build: sam-validate compile
	sam build --template-file SAMtemplates/main_template.yaml --region eu-west-2


compile-node:
	npx tsc --build tsconfig.build.json

compile: compile-node

lint-node: compile-node
	npm run lint --workspace packages/client
	npm run lint --workspace packages/server
	npm run lint --workspace packages/cdk

lint-githubactions:
	actionlint

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-githubactions lint-githubaction-scripts

test: compile
	npm run test --workspace packages/client
	npm run test --workspace packages/server
	npm run test --workspace packages/cdk

clean:
	rm -rf packages/client/coverage
	rm -rf packages/server/coverage
	rm -rf cdk.out

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

check-licenses: check-licenses-node check-licenses-python

check-licenses-node:
	npm run check-licenses
	npm run check-licenses --workspace packages/client
	npm run check-licenses --workspace packages/server
	npm run check-licenses --workspace packages/cdk


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

cdk-synth:
	npx cdk synth \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--context stackName=clinical-tracker-ui \
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

cdk-diff:
	npx cdk diff \
		--verbose \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/ClinicalPrescriptionTrackerApp.ts" \
		--context stackName=$$stack_name \
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
	rm -rf .asdf
	cp -r $$HOME/.asdf .
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .
