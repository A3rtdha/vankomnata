FROM php:8.2-cli

# Устанавливаем необходимые зависимости и PDO-драйверы для MySQL
RUN docker-php-ext-install pdo pdo_mysql

COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /app

COPY . /app

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "-t", "."]
