<?php
header('Content-Type: application/json; charset=utf-8');

$uploadDir = __DIR__ . '/../uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file'], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMap = [
        UPLOAD_ERR_INI_SIZE => 'Файл больше лимита upload_max_filesize (' . ini_get('upload_max_filesize') . ')',
        UPLOAD_ERR_FORM_SIZE => 'Файл больше лимита формы',
        UPLOAD_ERR_PARTIAL => 'Файл загружен частично',
        UPLOAD_ERR_NO_FILE => 'Файл не выбран',
        UPLOAD_ERR_NO_TMP_DIR => 'Не найдена временная папка',
        UPLOAD_ERR_CANT_WRITE => 'Не удалось записать файл на диск',
        UPLOAD_ERR_EXTENSION => 'Загрузка остановлена расширением PHP'
    ];
    $detail = $errorMap[$file['error']] ?? 'Неизвестная ошибка загрузки';
    http_response_code(400);
    echo json_encode(['error' => 'Upload error: ' . $detail], JSON_UNESCAPED_UNICODE);
    exit;
}

$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif'
];

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!isset($allowed[$mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Unsupported file type'], JSON_UNESCAPED_UNICODE);
    exit;
}

$ext = $allowed[$mime];
$name = bin2hex(random_bytes(8)) . '.' . $ext;
$path = $uploadDir . '/' . $name;

if (!move_uploaded_file($file['tmp_name'], $path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'url' => '/uploads/' . $name
], JSON_UNESCAPED_UNICODE);
