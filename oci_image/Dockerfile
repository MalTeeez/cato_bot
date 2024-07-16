FROM node:lts-alpine3.20

RUN mkdir /home/discord_bot/
WORKDIR /home/discord_bot/

COPY src/ .
COPY empty_config.json config.json

RUN npm i


COPY entrypoint.sh /
RUN chmod u+x /entrypoint.sh
ENTRYPOINT [ "/usr/bin/ash", "/entrypoint.sh" ]