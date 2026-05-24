<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : null;
$id = isset($_GET['id']) ? $_GET['id'] : null;

if ($method === 'POST' || $method === 'PUT' || $method === 'DELETE') {
    require_once __DIR__ . '/auth_check.php';
}

function getBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function formatProductTypes($p) {
    if (!$p) return null;
    $p['id'] = (int)$p['id'];
    $p['price'] = (float)$p['price'];
    $p['oldPrice'] = $p['oldPrice'] !== null ? (float)$p['oldPrice'] : null;
    $p['rating'] = $p['rating'] !== null ? (float)$p['rating'] : null;
    $p['reviews'] = (int)$p['reviews'];
    $p['stock'] = (int)$p['stock'];
    return $p;
}

function normalizeStock($stock) {
    if (!isset($stock)) {
        return 1;
    }
    if ($stock === false || $stock === 'false' || $stock === 0 || $stock === '0') {
        return 0;
    }
    return is_numeric($stock) ? (int)$stock : 1;
}

if ($method === 'GET') {
    if ($id !== null) {
        $stmt = $pdo->prepare('SELECT * FROM `products` WHERE `id` = ?');
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        if ($product) {
            echo json_encode(formatProductTypes($product), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        }
        http_response_code(404);
        echo json_encode(['error' => 'Not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->query('SELECT * FROM `products` ORDER BY `id` ASC');
    $products = $stmt->fetchAll();
    $formatted = array_map('formatProductTypes', $products);
    echo json_encode($formatted, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST' && $action === 'import') {
    $items = getBody();
    if (!is_array($items)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid payload'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO `products`
            (`name`, `category`, `price`, `oldPrice`, `badge`, `rating`, `reviews`, `stock`, `desc`, `img`)
            VALUES (:name, :category, :price, :oldPrice, :badge, :rating, :reviews, :stock, :desc, :img)');

        foreach ($items as $item) {
            if (!is_array($item)) continue;

            $stmt->execute([
                ':name'     => $item['name'] ?? '',
                ':category' => $item['category'] ?? '',
                ':price'    => $item['price'] ?? 0,
                ':oldPrice' => !empty($item['oldPrice']) ? $item['oldPrice'] : null,
                ':badge'    => !empty($item['badge']) ? $item['badge'] : null,
                ':rating'   => !empty($item['rating']) ? $item['rating'] : null,
                ':reviews'  => isset($item['reviews']) ? (int)$item['reviews'] : 0,
                ':stock'    => normalizeStock($item['stock'] ?? null),
                ':desc'     => $item['desc'] ?? null,
                ':img'      => $item['img'] ?? ''
            ]);
        }
        $pdo->commit();
    } catch (\Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Импорт прерван из-за ошибки: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->query('SELECT * FROM `products` ORDER BY `id` ASC');
    $products = $stmt->fetchAll();
    echo json_encode(array_map('formatProductTypes', $products), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST') {
    $product = getBody();
    if (empty($product['name']) || empty($product['category']) || empty($product['img'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stockVal = normalizeStock($product['stock'] ?? null);

    $stmt = $pdo->prepare('INSERT INTO `products`
        (`name`, `category`, `price`, `oldPrice`, `badge`, `rating`, `reviews`, `stock`, `desc`, `img`)
        VALUES (:name, :category, :price, :oldPrice, :badge, :rating, :reviews, :stock, :desc, :img)');

    $stmt->execute([
        ':name'     => $product['name'],
        ':category' => $product['category'],
        ':price'    => $product['price'],
        ':oldPrice' => !empty($product['oldPrice']) ? $product['oldPrice'] : null,
        ':badge'    => !empty($product['badge']) ? $product['badge'] : null,
        ':rating'   => !empty($product['rating']) ? $product['rating'] : null,
        ':reviews'  => isset($product['reviews']) ? (int)$product['reviews'] : 0,
        ':stock'    => $stockVal,
        ':desc'     => $product['desc'] ?? null,
        ':img'      => $product['img']
    ]);

    $newId = $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM `products` WHERE `id` = ?');
    $stmt->execute([$newId]);
    $created = $stmt->fetch();
    echo json_encode(formatProductTypes($created), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'PUT' && $id !== null) {
    $payload = getBody();

    $stmt = $pdo->prepare('SELECT * FROM `products` WHERE `id` = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode(['error' => 'Not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $name = $payload['name'] ?? $existing['name'];
    $category = $payload['category'] ?? $existing['category'];
    $price = $payload['price'] ?? $existing['price'];
    $oldPrice = array_key_exists('oldPrice', $payload) ? $payload['oldPrice'] : $existing['oldPrice'];
    $badge = array_key_exists('badge', $payload) ? $payload['badge'] : $existing['badge'];
    $rating = array_key_exists('rating', $payload) ? $payload['rating'] : $existing['rating'];
    $reviews = array_key_exists('reviews', $payload) ? $payload['reviews'] : $existing['reviews'];
    $desc = array_key_exists('desc', $payload) ? $payload['desc'] : $existing['desc'];
    $img = $payload['img'] ?? $existing['img'];

    $stockVal = array_key_exists('stock', $payload)
        ? normalizeStock($payload['stock'])
        : (int)$existing['stock'];

    $stmt = $pdo->prepare('UPDATE `products` SET
        `name` = :name,
        `category` = :category,
        `price` = :price,
        `oldPrice` = :oldPrice,
        `badge` = :badge,
        `rating` = :rating,
        `reviews` = :reviews,
        `stock` = :stock,
        `desc` = :desc,
        `img` = :img
        WHERE `id` = :id');

    $stmt->execute([
        ':name'     => $name,
        ':category' => $category,
        ':price'    => $price,
        ':oldPrice' => !empty($oldPrice) ? $oldPrice : null,
        ':badge'    => !empty($badge) ? $badge : null,
        ':rating'   => !empty($rating) ? $rating : null,
        ':reviews'  => isset($reviews) ? (int)$reviews : 0,
        ':stock'    => $stockVal,
        ':desc'     => !empty($desc) ? $desc : null,
        ':img'      => $img,
        ':id'       => $id
    ]);

    $stmt = $pdo->prepare('SELECT * FROM `products` WHERE `id` = ?');
    $stmt->execute([$id]);
    $updated = $stmt->fetch();
    echo json_encode(formatProductTypes($updated), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'DELETE' && $id !== null) {
    $stmt = $pdo->prepare('DELETE FROM `products` WHERE `id` = ?');
    $stmt->execute([$id]);
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
