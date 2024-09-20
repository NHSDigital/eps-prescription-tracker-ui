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

sam-sync: guard-AWS_DEFAULT_PROFILE guard-stack_name
	sam sync \
		--stack-name $$stack_name \
		--watch \
		--template-file SAMtemplates/main_template.yaml \
		--parameter-overrides \
			  PrimaryOIDCClientID=$$Auth0ClientID \
			  PrimaryOIDClientSecret=$$Auth0ClientSecret \
			  PrimaryOIDCIssuer=$$Auth0Issuer \
			  PrimaryOIDCAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
			  PrimaryOIDCTokenEndpoint=$$Auth0TokenEndpoint \
			  PrimaryOIDCUserInfoEndpoint=$$Auth0UserInfoEndpoint \
			  PrimaryOIDCJWKSEndpoint=$$Auth0JWKSEndpoint \
			  UserPoolTLSCertificateArn=$$UserPoolTLSCertificateArn

sam-sync-certs: guard-AWS_DEFAULT_PROFILE
	sam sync \
		--stack-name $$stack_name \
		--region us-east-1 \
		--watch \
		--template-file SAMtemplates/certificates/main.yaml \
		--parameter-overrides \
			  StackName=$$stack_name \
			  epsDomain=$$epsDomain \
			  epsZoneId=$$epsZoneId 

sam-deploy: guard-AWS_DEFAULT_PROFILE guard-stack_name
	sam deploy \
		--stack-name $$stack_name \
		--parameter-overrides \
			  EnableSplunk=false 
sam-delete: guard-AWS_DEFAULT_PROFILE guard-stack_name
	sam delete --stack-name $$stack_name

sam-list-endpoints: guard-AWS_DEFAULT_PROFILE guard-stack_name
	sam list endpoints --stack-name $$stack_name

sam-list-resources: guard-AWS_DEFAULT_PROFILE guard-stack_name
	sam list resources --stack-name $$stack_name

sam-list-outputs: guard-AWS_DEFAULT_PROFILE guard-stack_name
	sam list stack-outputs --stack-name $$stack_name

sam-validate: 
	sam validate --template-file SAMtemplates/main_template.yaml --region eu-west-2

sam-deploy-package: guard-artifact_bucket guard-artifact_bucket_prefix guard-stack_name guard-template_file guard-cloud_formation_execution_role guard-VERSION_NUMBER guard-COMMIT_ID guard-LOG_LEVEL guard-LOG_RETENTION_DAYS guard-TARGET_ENVIRONMENT
	sam deploy \
		--template-file $$template_file \
		--stack-name $$stack_name \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
		--region eu-west-2 \
		--s3-bucket $$artifact_bucket \
		--s3-prefix $$artifact_bucket_prefix \
		--config-file samconfig_package_and_deploy.toml \
		--no-fail-on-empty-changeset \
		--role-arn $$cloud_formation_execution_role \
		--no-confirm-changeset \
		--force-upload \
		--tags "version=$$VERSION_NUMBER" \
		--parameter-overrides \
			  EnableSplunk=true \
			  VersionNumber=$$VERSION_NUMBER \
			  CommitId=$$COMMIT_ID \
			  LogLevel=$$LOG_LEVEL \
			  LogRetentionDays=$$LOG_RETENTION_DAYS \
			  Env=$$TARGET_ENVIRONMENT

compile-node:
	npx tsc --build tsconfig.build.json

compile: compile-node

lint-node: compile-node
	npm run lint --workspace packages/client
	npm run lint --workspace packages/server
	npm run lint --workspace packages/cdk

lint-samtemplates:
	poetry run cfn-lint -I "SAMtemplates/**/*.y*ml" 2>&1 | awk '/Run scan/ { print } /^[EW][0-9]/ { print; getline; print }'

lint-githubactions:
	actionlint

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-samtemplates lint-githubactions lint-githubaction-scripts

test: compile
	npm run test --workspace packages/client
	npm run test --workspace packages/server

clean:
	rm -rf packages/client/coverage
	rm -rf packages/server/coverage
	rm -rf .aws-sam
	rm -rf packages/cdk/cdk.out

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

check-licenses: check-licenses-node check-licenses-python

check-licenses-node:
	npm run check-licenses
	npm run check-licenses --workspace packages/client
	npm run check-licenses --workspace packages/server

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
	cd packages/cdk && cdk deploy --all \
		--ci true \
		--require-approval never \
		--context stackName=$$stack_name \
		--parameters primaryOidcClientId=$$Auth0ClientID \
		--parameters primaryOidClientSecret=$$Auth0ClientSecret \
		--parameters primaryOidcIssuer=$$Auth0Issuer \
		--parameters primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--parameters primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--parameters primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--parameters primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--parameters epsDomain=$$epsDomain \
		--parameters epsZoneId=$$epsZoneId 

cdk-synth: guard-AWS_DEFAULT_PROFILE guard-stack_name
	cd packages/cdk && cdk synth --output=/home/cdkuser/templates --all \
		--context stackName=cdk-auth-new \
		--parameters primaryOidcClientId=$$Auth0ClientID \
		--parameters primaryOidClientSecret=$$Auth0ClientSecret \
		--parameters primaryOidcIssuer=$$Auth0Issuer \
		--parameters primaryOidcAuthorizeEndpoint=$$Auth0AuthorizeEndpoint \
		--parameters primaryOidcTokenEndpoint=$$Auth0TokenEndpoint \
		--parameters primaryOidcUserInfoEndpoint=$$Auth0UserInfoEndpoint \
		--parameters primaryOidcjwksEndpoint=$$Auth0JWKSEndpoint \
		--parameters epsDomain=$$epsDomain \
		--parameters epsZoneId=$$epsZoneId 

build-deployment-image:
	rm -rf .asdf
	cp -r $$HOME/.asdf .
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .
