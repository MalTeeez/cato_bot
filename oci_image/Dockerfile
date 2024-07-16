FROM node:lts-bookworm

# Copy meatball
RUN mkdir -p /home/cache/
COPY cache/meatball.jpg /home/cache/

RUN mkdir /home/discord_bot/
WORKDIR /home/discord_bot/

COPY src/ .
COPY oci_image/empty_config.json config.json


# Install packages
RUN npm i

# Install ffmpeg
RUN wget "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"
RUN tar xf ffmpeg-master-latest-linux64-gpl.tar.xz
RUN mv ffmpeg-master-latest-linux64-gpl/bin/ffmpeg ffmpeg
RUN rm -rf ffmpeg-master-latest-linux64-gpl/ && rm ffmpeg-master-latest-linux64-gpl.tar.xz

COPY oci_image/entrypoint.sh /
RUN chmod u+x /entrypoint.sh
ENTRYPOINT [ "/usr/bin/bash", "/entrypoint.sh" ]