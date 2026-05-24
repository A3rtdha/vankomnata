<?php
$db   = 'vancom_db';
$user = 'vancom_user';
$pass = 'vancom_pass';
$charset = 'utf8mb4';

$hosts = array_values(array_unique(array_filter([
    getenv('MYSQL_HOST') ?: null,
    'db',
    '127.0.0.1',
])));

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$pdo = null;
$lastError = null;

foreach ($hosts as $host) {
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass, $options);
        break;
    } catch (\PDOException $e) {
        $lastError = $e;
    }
}

if (!$pdo) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'Не удалось подключиться к MySQL.',
        'hint'  => 'Запустите: docker compose up --build. Сайт: http://localhost:8080. Если ошибка остаётся — сбросьте том БД: docker compose down -v && docker compose up --build.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Самовосстановление базы и авто-миграция старых данных
try {
    // Создаем таблицу товаров со всеми типами данных, если её нет
    $pdo->exec("CREATE TABLE IF NOT EXISTS `products` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(255) NOT NULL,
        `category` VARCHAR(100) NOT NULL,
        `price` DECIMAL(10,2) NOT NULL,
        `oldPrice` DECIMAL(10,2) NULL,
        `badge` VARCHAR(50) NULL,
        `rating` DECIMAL(3,2) NULL,
        `reviews` INT DEFAULT 0,
        `stock` INT DEFAULT 1,
        `desc` TEXT NULL,
        `img` VARCHAR(512) NOT NULL,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `reviews` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `product_id` INT NOT NULL,
        `author` VARCHAR(100) NOT NULL,
        `rating` INT NOT NULL,
        `text` TEXT NOT NULL,
        `ip_address` VARCHAR(45) NOT NULL,
        `is_approved` TINYINT DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Если база пуста — проверяем, есть ли старый products.json, и переносим данные в MySQL
    $count = $pdo->query("SELECT COUNT(*) FROM `products`")->fetchColumn();

    if ($count == 0) {
        $jsonPath = __DIR__ . '/../data/products.json';
        if (file_exists($jsonPath)) {
            $raw = file_get_contents($jsonPath);
            $products = json_decode($raw, true);
            if (is_array($products) && !empty($products)) {
                $stmt = $pdo->prepare("INSERT INTO `products`
                    (`id`, `name`, `category`, `price`, `oldPrice`, `badge`, `rating`, `reviews`, `stock`, `desc`, `img`)
                    VALUES (:id, :name, :category, :price, :oldPrice, :badge, :rating, :reviews, :stock, :desc, :img)");

                foreach ($products as $p) {
                    $stockVal = 1;
                    if (isset($p['stock'])) {
                        if ($p['stock'] === false || $p['stock'] === 'false' || $p['stock'] === 0) {
                            $stockVal = 0;
                        } else {
                            $stockVal = is_numeric($p['stock']) ? (int)$p['stock'] : 1;
                        }
                    }

                    $stmt->execute([
                        ':id'       => isset($p['id']) ? (int)$p['id'] : null,
                        ':name'     => $p['name'] ?? '',
                        ':category' => $p['category'] ?? '',
                        ':price'    => $p['price'] ?? 0,
                        ':oldPrice' => !empty($p['oldPrice']) ? $p['oldPrice'] : null,
                        ':badge'    => !empty($p['badge']) ? $p['badge'] : null,
                        ':rating'   => !empty($p['rating']) ? $p['rating'] : null,
                        ':reviews'  => isset($p['reviews']) ? (int)$p['reviews'] : 0,
                        ':stock'    => $stockVal,
                        ':desc'     => $p['desc'] ?? null,
                        ':img'      => $p['img'] ?? ''
                    ]);
                }

                $maxId = $pdo->query('SELECT COALESCE(MAX(`id`), 0) FROM `products`')->fetchColumn();
                $pdo->exec('ALTER TABLE `products` AUTO_INCREMENT = ' . ((int)$maxId + 1));
            }
        }
    }
} catch (\PDOException $e) {
    error_log('Ошибка автоматической инициализации таблиц: ' . $e->getMessage());
}
