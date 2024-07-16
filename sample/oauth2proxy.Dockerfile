FROM ubuntu:20.04

RUN apt-get update && apt-get install -y \
    curl \
    nano \
    sudo \
    golang-go

WORKDIR /app

RUN go install github.com/oauth2-proxy/v7@latest

ENV GOPATH=$HOME/go

ENV PATH=$PATH:$GOPATH/bin

COPY oauth2proxy.cfg /app/oauth2proxy.cfg

EXPOSE 3000
EXPOSE 4180

COPY oauthEntrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/oauthEntrypoint.sh
ENTRYPOINT ["oauthEntrypoint.sh"]

CMD ["oauth2-proxy", "--config", "/app/oauth2proxy.cfg", "--code-challenge-method", "S256", "--logging-filename", ""]
