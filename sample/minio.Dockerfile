FROM node:14

WORKDIR /app

COPY . /app

RUN yarn install

RUN curl https://dl.min.io/client/mc/release/linux-amd64/mc --create-dirs -o /usr/local/bin/mc && \
    chmod +x /usr/local/bin/mc

ENV PATH=$PATH:/usr/local/bin/

EXPOSE 3000

COPY minioEntrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/minioEntrypoint.sh
ENTRYPOINT ["minioEntrypoint.sh"]

CMD ["yarn", "start"]
