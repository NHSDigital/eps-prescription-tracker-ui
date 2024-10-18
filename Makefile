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
	npm run lint --workspace packages/cloudfrontFunctions
	npm run lint --workspace packages/cdk

lint-githubactions:
	actionlint

lint-githubaction-scripts:
	shellcheck .github/scripts/*.sh

lint: lint-node lint-githubactions lint-githubaction-scripts react-lint

test: compile
	npm run test --workspace packages/cloudfrontFunctions
	npm run test --workspace packages/cdk

clean:
	rm -rf packages/cloudfrontFunctions/coverage
	rm -rf packages/cloudfrontFunctions/lib
	rm -rf cdk.out
	rm -rf packages/cpt-ui/.next

deep-clean: clean
	rm -rf .venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +

check-licenses: check-licenses-node check-licenses-python

check-licenses-node:
	npm run check-licenses
	npm run check-licenses --workspace packages/cloudfrontFunctions
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

react-dev:
	npm run dev --workspace packages/cpt-ui

react-build:
	npm run build --workspace packages/cpt-ui

react-start:
	npm run start --workspace packages/cpt-ui

react-lint:
	npm run lint --workspace packages/cpt-ui

cdk-deploy: guard-stack_name guard-CDK_APP_NAME
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	VERSION_NUMBER="$${VERSION_NUMBER:-undefined}" && \
	COMMIT_ID="$${COMMIT_ID:-undefined}" && \
		npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--all \
		--ci true \
		--require-approval $${REQUIRE_APPROVAL} \
		--context stackName=$$stack_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID 

cdk-synth: cdk-synth-backend cdk-synth-shared-resources

cdk-synth-shared-resources: cdk-synth-shared-resources-uk cdk-synth-shared-resources-us

cdk-synth-shared-resources-uk:
	npx cdk synth \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/SharedResourcesApp_uk.ts" \
		--context stackName=cpt-ui

cdk-synth-shared-resources-us:
	npx cdk synth \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/SharedResourcesApp_us.ts" \
		--context stackName=cpt-ui 

cdk-synth-backend:
	npx cdk synth \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/BackendApp.ts" \
		--context stackName=cpt-ui-backend

cdk-diff: guard-cdk_app_name
	npx cdk diff \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--context stackName=$$stack_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID 

cdk-watch: guard-stack_name guard-cdk_app_name
	REQUIRE_APPROVAL="$${REQUIRE_APPROVAL:-any-change}" && \
	VERSION_NUMBER="$${VERSION_NUMBER:-undefined}" && \
	COMMIT_ID="$${COMMIT_ID:-undefined}" && \
		npx cdk deploy \
		--app "npx ts-node --prefer-ts-exts packages/cdk/bin/$$CDK_APP_NAME.ts" \
		--watch \
		--all \
		--ci true \
		--require-approval $${REQUIRE_APPROVAL} \
		--context stackName=$$stack_name \
		--context VERSION_NUMBER=$$VERSION_NUMBER \
		--context COMMIT_ID=$$COMMIT_ID


build-deployment-container-image:
	docker build -t "clinical-prescription-tracker-ui" -f docker/Dockerfile .
