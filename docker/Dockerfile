FROM ubuntu:24.04

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y upgrade \
    && apt-get -y install --no-install-recommends \
        apt-transport-https \
        bash-completion \
        bats \
        bats-assert \
        bats-file \
        bats-support \
        build-essential \
        ca-certificates \
        curl \
        git \
        gnupg-agent \
        htop \
        jq \
        libbz2-dev \
        libffi-dev \
        libjpeg8-dev \
        liblzma-dev \
        libncurses5-dev \
        libncursesw5-dev \
        libreadline-dev \
        libsecret-1-0 \
        libsecret-1-dev \
        libsqlite3-dev \
        libssl-dev \
        libxml2-dev \
        libxslt1-dev \
        libyaml-dev \
        llvm \
        make \
        python3 \
        python3-dev \
        python3-pip \
        software-properties-common \
        tk-dev \
        uninstall \
        unixodbc \
        unixodbc-dev \
        unzip \
        vim \
        wget \
        xz-utils \
        zlib1g-dev

# install aws stuff
RUN wget -O /tmp/awscliv2.zip "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" && \
    unzip /tmp/awscliv2.zip -d /tmp/aws-cli && \
    /tmp/aws-cli/aws/install && \
    rm tmp/awscliv2.zip && \
    rm -rf /tmp/aws-cli

RUN useradd -ms /bin/bash cdkuser
RUN chown -R cdkuser /home/cdkuser
WORKDIR /home/cdkuser
USER cdkuser
# Install ASDF
RUN git clone https://github.com/asdf-vm/asdf.git /home/cdkuser/.asdf --branch v0.14.1; \
    echo '. /home/cdkuser/.asdf/asdf.sh' >> ~/.bashrc; \
    echo '. /home/cdkuser/.asdf/completions/asdf.bash' >> ~/.bashrc; \
    echo 'PATH="$PATH:/home/cdkuser/.asdf/bin/"' >> ~/.bashrc;

ENV PATH="$PATH:/home/cdkuser/.asdf/bin/:/home/cdkuser/node_modules/.bin"

# Install ASDF plugins
RUN asdf plugin add shellcheck https://github.com/luizm/asdf-shellcheck.git; \
    asdf plugin add actionlint; \
    asdf plugin add python; \
    asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git; \
    asdf plugin add poetry https://github.com/asdf-community/asdf-poetry.git; \
    asdf plugin add direnv; \
    asdf plugin add actionlint; \
    asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git

# copy local asdf folder to make the build faster
COPY --chown=cdkuser .asdf /home/cdkuser/.asdf
COPY --chown=cdkuser .tool-versions /home/cdkuser/.tool-versions

RUN asdf install; \
    asdf reshim python; \
    asdf reshim poetry; \
    asdf reshim nodejs; \
    asdf direnv setup --shell bash --version 2.32.2;

# copy files needed for deployment
COPY --chown=cdkuser packages /home/cdkuser/packages
COPY --chown=cdkuser Makefile /home/cdkuser/
COPY --chown=cdkuser node_modules /home/cdkuser/node_modules
COPY --chown=cdkuser package.json /home/cdkuser/
COPY --chown=cdkuser package-lock.json /home/cdkuser/
COPY --chown=cdkuser tsconfig.defaults.json /home/cdkuser/
COPY --chown=cdkuser docker/entrypoint.sh /home/cdkuser/

ENTRYPOINT ["/home/cdkuser/entrypoint.sh"]
