<?php
header('Content-Type: application/json; charset=utf-8');

$dataFile = __DIR__ . '/../data/products.json';

if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : null;
$id = isset($_GET['id']) ? $_GET['id'] : null;

function readProducts($path) {
    $raw = file_get_contents($path);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function saveProducts($path, $data) {
    $json = json_encode(array_values($data), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($path, $json, LOCK_EX);
}

function getBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

if ($method === 'GET') {
    $products = readProducts($dataFile);
    if ($id !== null) {
        foreach ($products as $p) {
            if ((string)$p['id'] === (string)$id) {
                echo json_encode($p, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit;
            }
        }
        http_response_code(404);
        echo json_encode(['error' => 'Not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode($products, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST' && $action === 'import') {
    $items = getBody();
    if (!is_array($items)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid payload'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $products = readProducts($dataFile);
    $maxId = 0;
    foreach ($products as $p) {
        if (isset($p['id']) && $p['id'] > $maxId) $maxId = $p['id'];
    }
    $nextId = $maxId + 1;
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $item['id'] = $nextId++;
        $products[] = $item;
    }
    saveProducts($dataFile, $products);
    echo json_encode($products, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'POST') {
    $product = getBody();
    if (empty($product['name']) || empty($product['category']) || empty($product['img'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $products = readProducts($dataFile);
    $maxId = 0;
    foreach ($products as $p) {
        if (isset($p['id']) && $p['id'] > $maxId) $maxId = $p['id'];
    }
    $product['id'] = $maxId + 1;
    $products[] = $product;
    saveProducts($dataFile, $products);
    echo json_encode($product, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method === 'PUT' && $id !== null) {
    $payload = getBody();
    $products = readProducts($dataFile);
    foreach ($products as $index => $p) {
        if ((string)$p['id'] === (string)$id) {
            $updated = array_merge($p, $payload, ['id' => $p['id']]);
            $products[$index] = $updated;
            saveProducts($dataFile, $products);
            echo json_encode($updated, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Not found'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'DELETE' && $id !== null) {
    $products = readProducts($dataFile);
    $filtered = array_filter($products, function($p) use ($id) {
        return (string)$p['id'] !== (string)$id;
    });
    saveProducts($dataFile, $filtered);
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
