run-jekyll:
	bundle exec jekyll serve

sync-main:
	git checkout first_pr .tool-versions
	git checkout first_pr .pre-commit-config.yaml
	git checkout first_pr .gitignore
	git checkout first_pr .devcontainer
	git checkout first_pr pyproject.toml
	git checkout first_pr poetry.lock
	git checkout first_pr poetry.lock
	git checkout first_pr package.json
	git checkout first_pr package-lock.json

# install targets
install: install-python install-hooks install-node install-jekyll

install-python:
	poetry install

install-node:
	npm ci

install-jekyll:
	gem install jekyll bundler
	bundle install

install-hooks: install-python
	poetry run pre-commit install --install-hooks --overwrite