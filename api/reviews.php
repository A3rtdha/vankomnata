<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_use_only_cookies', 1);
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

function getClientIp(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($parts[0]);
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = trim($_SERVER['HTTP_CLIENT_IP']);
    }
    return substr($ip, 0, 45);
}

$method = $_SERVER['REQUEST_METHOD'];
$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;

if ($method === 'GET') {
    if (!$productId) {
        http_response_code(400);
        echo json_encode(['error' => 'Не указан ID товара'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT `id`, `author`, `rating`, `text`, `created_at`
         FROM `reviews`
         WHERE `product_id` = ? AND `is_approved` = 1
         ORDER BY `created_at` DESC'
    );
    $stmt->execute([$productId]);
    $reviews = $stmt->fetchAll();

    foreach ($reviews as &$r) {
        $r['id'] = (int)$r['id'];
        $r['rating'] = (int)$r['rating'];
    }
    unset($r);

    echo json_encode($reviews, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Некорректный JSON'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $productId = isset($input['product_id']) ? (int)$input['product_id'] : 0;
    $author = trim($input['author'] ?? '');
    $rating = isset($input['rating']) ? (int)$input['rating'] : 0;
    $text = trim($input['text'] ?? '');

    if (!$productId || $author === '' || !$rating || $text === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Все поля формы обязательны к заполнению'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($rating < 1 || $rating > 5) {
        http_response_code(400);
        echo json_encode(['error' => 'Некорректная оценка'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (mb_strlen($author) > 100) {
        http_response_code(400);
        echo json_encode(['error' => 'Имя слишком длинное'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (mb_strlen($text) > 5000) {
        http_response_code(400);
        echo json_encode(['error' => 'Текст отзыва слишком длинный'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $checkProduct = $pdo->prepare('SELECT `id` FROM `products` WHERE `id` = ?');
    $checkProduct->execute([$productId]);
    if (!$checkProduct->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Товар не найден'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ip = getClientIp();
    $timeout = 120;

    if (isset($_SESSION['last_review_time']) && (time() - (int)$_SESSION['last_review_time']) < $timeout) {
        http_response_code(429);
        echo json_encode(['error' => 'Вы отправляете отзывы слишком часто. Пожалуйста, подождите 2 минуты.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM `reviews`
         WHERE `product_id` = ? AND `ip_address` = ? AND `created_at` > NOW() - INTERVAL 1 DAY'
    );
    $stmt->execute([$productId, $ip]);
    if ((int)$stmt->fetchColumn() > 0) {
        http_response_code(429);
        echo json_encode(['error' => 'С вашего IP-адреса уже отправлен отзыв на этот товар сегодня. Попробуйте завтра.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO `reviews` (`product_id`, `author`, `rating`, `text`, `ip_address`, `is_approved`)
         VALUES (?, ?, ?, ?, ?, 0)'
    );
    $stmt->execute([$productId, $author, $rating, $text, $ip]);

    $_SESSION['last_review_time'] = time();

    echo json_encode([
        'success' => true,
        'message' => 'Спасибо! Ваш отзыв отправлен на модерацию и появится после проверки администратором.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
