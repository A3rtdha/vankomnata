<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db.php';

function syncProductReviewStats(PDO $pdo, int $productId): void
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS cnt, AVG(`rating`) AS avg_rating
         FROM `reviews`
         WHERE `product_id` = ? AND `is_approved` = 1'
    );
    $stmt->execute([$productId]);
    $row = $stmt->fetch();

    $count = (int)($row['cnt'] ?? 0);
    $avg = $row['avg_rating'] !== null ? round((float)$row['avg_rating'], 2) : null;

    $update = $pdo->prepare('UPDATE `products` SET `reviews` = ?, `rating` = ? WHERE `id` = ?');
    $update->execute([$count, $avg, $productId]);
}

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null;

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT r.*, p.name AS product_name
         FROM `reviews` r
         JOIN `products` p ON r.product_id = p.id
         ORDER BY r.is_approved ASC, r.created_at DESC'
    );
    $reviews = $stmt->fetchAll();

    foreach ($reviews as &$r) {
        $r['id'] = (int)$r['id'];
        $r['product_id'] = (int)$r['product_id'];
        $r['rating'] = (int)$r['rating'];
        $r['is_approved'] = (int)$r['is_approved'];
    }
    unset($r);

    echo json_encode($reviews, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST' && $action === 'approve' && $id) {
    $stmt = $pdo->prepare('SELECT `product_id` FROM `reviews` WHERE `id` = ?');
    $stmt->execute([$id]);
    $review = $stmt->fetch();

    if (!$review) {
        http_response_code(404);
        echo json_encode(['error' => 'Отзыв не найден'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo->prepare('UPDATE `reviews` SET `is_approved` = 1 WHERE `id` = ?')->execute([$id]);
    syncProductReviewStats($pdo, (int)$review['product_id']);

    echo json_encode(['success' => true, 'message' => 'Отзыв успешно одобрен и опубликован'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'DELETE' && $id) {
    $stmt = $pdo->prepare('SELECT `product_id`, `is_approved` FROM `reviews` WHERE `id` = ?');
    $stmt->execute([$id]);
    $review = $stmt->fetch();

    if (!$review) {
        http_response_code(404);
        echo json_encode(['error' => 'Отзыв не найден'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $productId = (int)$review['product_id'];
    $wasApproved = (int)$review['is_approved'] === 1;

    $pdo->prepare('DELETE FROM `reviews` WHERE `id` = ?')->execute([$id]);

    if ($wasApproved) {
        syncProductReviewStats($pdo, $productId);
    }

    echo json_encode(['success' => true, 'message' => 'Отзыв удален'], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
