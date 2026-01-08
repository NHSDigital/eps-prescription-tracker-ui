FROM mcr.microsoft.com/devcontainers/base:ubuntu
ARG TARGETARCH
ENV TARGETARCH=${TARGETARCH}

ARG ASDF_VERSION
COPY .tool-versions.asdf /tmp/.tool-versions.asdf

# Add amd64 architecture if on arm64
RUN if [ "$TARGETARCH" == "arm64" ] || [ "$TARGETARCH" == "aarch64" ]; then dpkg --add-architecture amd64; fi

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y dist-upgrade \
    && apt-get -y install --no-install-recommends htop vim curl git build-essential \
    libffi-dev libssl-dev libxml2-dev libxslt1-dev libjpeg8-dev libbz2-dev \
    zlib1g-dev unixodbc unixodbc-dev libsecret-1-0 libsecret-1-dev libsqlite3-dev \
    jq apt-transport-https ca-certificates gnupg-agent \
    software-properties-common bash-completion python3-pip make libbz2-dev \
    libreadline-dev libsqlite3-dev wget llvm libncurses5-dev libncursesw5-dev \
    xz-utils tk-dev liblzma-dev netcat-traditional libyaml-dev uuid-runtime xxd unzip

# install aws stuff
# Download correct AWS CLI for arch
RUN if [ "$TARGETARCH" = "arm64" ] || [ "$TARGETARCH" == "aarch64" ]; then \
      wget -O /tmp/awscliv2.zip "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip"; \
    else \
      wget -O /tmp/awscliv2.zip "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"; \
    fi && \
    unzip /tmp/awscliv2.zip -d /tmp/aws-cli && \
    /tmp/aws-cli/aws/install && \
    rm /tmp/awscliv2.zip && rm -rf /tmp/aws-cli

# Install ASDF
RUN ASDF_VERSION=$(awk '!/^#/ && NF {print $1; exit}' /tmp/.tool-versions.asdf) && \
    wget -O /tmp/asdf.tar.gz https://github.com/asdf-vm/asdf/releases/download/v${ASDF_VERSION}/asdf-v${ASDF_VERSION}-linux-amd64.tar.gz; \
    tar -xvzf /tmp/asdf.tar.gz; \
    mv asdf /usr/bin

USER vscode

ENV PATH="/home/vscode/.asdf/shims/:$PATH"
RUN \
    echo 'PATH="/home/vscode/.asdf/shims/:$PATH"' >> ~/.bashrc; \
    echo '. <(asdf completion bash)' >> ~/.bashrc; \
    echo '# Install Ruby Gems to ~/gems' >> ~/.bashrc; \
    echo 'export GEM_HOME="$HOME/gems"' >> ~/.bashrc; \
    echo 'export PATH="$HOME/gems/bin:$PATH"' >> ~/.bashrc;

# Install ASDF plugins
RUN asdf plugin add python; \
    asdf plugin add poetry https://github.com/asdf-community/asdf-poetry.git; \
    asdf plugin add shellcheck https://github.com/luizm/asdf-shellcheck.git; \
    asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git; \
    asdf plugin add direnv; \
    asdf plugin add actionlint; \
    asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git


WORKDIR /workspaces/eps-prescription-tracker-ui
ADD .tool-versions /workspaces/eps-prescription-tracker-ui/.tool-versions
ADD .tool-versions /home/vscode/.tool-versions

# install python before poetry to ensure correct python version is used
RUN asdf install python; \
    asdf install
