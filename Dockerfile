FROM php:8.2-cli

WORKDIR /app

RUN printf "upload_max_filesize=15M\npost_max_size=15M\n" > /usr/local/etc/php/conf.d/uploads.ini

COPY . /app

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "-t", "."]
