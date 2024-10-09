FROM ubuntu:24.04
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y upgrade

RUN export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends ca-certificates curl git jq make unzip wget \
    && apt-get clean

# install aws stuff
ADD https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip /tmp/awscliv2.zip
RUN unzip /tmp/awscliv2.zip -d /tmp/aws-cli && \
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
RUN asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git

# remove ruby, python, poetry from asdf install
COPY --chown=cdkuser .tool-versions /home/cdkuser/.tool-versions
RUN sed -i -n '/nodejs/p'  /home/cdkuser/.tool-versions

RUN asdf install; \
    asdf reshim nodejs

    # copy files needed for deployment
COPY --chown=cdkuser packages /home/cdkuser/packages
COPY --chown=cdkuser Makefile /home/cdkuser/
COPY --chown=cdkuser node_modules /home/cdkuser/node_modules
COPY --chown=cdkuser package.json /home/cdkuser/
COPY --chown=cdkuser package-lock.json /home/cdkuser/
COPY --chown=cdkuser tsconfig.defaults.json /home/cdkuser/
COPY --chown=cdkuser docker/entrypoint.sh /home/cdkuser/

ENTRYPOINT ["/home/cdkuser/entrypoint.sh"]
