<?php
require_once __DIR__ . '/auth_check.php';

header('Content-Type: application/json; charset=utf-8');

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function parseIniSize(string $value): int
{
    $value = trim($value);
    if ($value === '') {
        return 0;
    }

    $unit = strtolower(substr($value, -1));
    $number = (float) $value;

    return match ($unit) {
        'g' => (int) ($number * 1024 * 1024 * 1024),
        'm' => (int) ($number * 1024 * 1024),
        'k' => (int) ($number * 1024),
        default => (int) $number,
    };
}

function uploadErrorMessage(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Файл слишком большой. Максимум 10 МБ.',
        UPLOAD_ERR_PARTIAL => 'Файл загружен не полностью. Попробуйте ещё раз.',
        UPLOAD_ERR_NO_FILE => 'Файл не выбран.',
        UPLOAD_ERR_NO_TMP_DIR => 'На сервере нет временной папки для загрузки.',
        UPLOAD_ERR_CANT_WRITE => 'Не удалось записать файл на сервер.',
        UPLOAD_ERR_EXTENSION => 'Загрузка заблокирована настройками PHP.',
        default => 'Ошибка загрузки файла.',
    };
}

$uploadDir = __DIR__ . '/../uploads';
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true) && !is_dir($uploadDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Не удалось создать папку uploads'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
$postMaxBytes = parseIniSize((string) ini_get('post_max_size'));
if ($contentLength > 0 && $postMaxBytes > 0 && $contentLength > $postMaxBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'Файл слишком большой. Максимум 10 МБ.'], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Файл не получен сервером. Проверьте размер (до 10 МБ).'], JSON_UNESCAPED_UNICODE);
    exit;
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => uploadErrorMessage((int) $file['error'])], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($file['size'] ?? 0) > MAX_UPLOAD_BYTES) {
    http_response_code(413);
    echo json_encode(['error' => 'Файл слишком большой. Максимум 10 МБ.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$allowed = [
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/pjpeg' => 'jpg',
    'image/png' => 'png',
    'image/x-png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'image/avif' => 'avif',
];

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: '';
$ext = $allowed[$mime] ?? null;

if (!$ext) {
    $imageInfo = @getimagesize($file['tmp_name']);
    if (is_array($imageInfo) && isset($imageInfo[2])) {
        $type = (int) $imageInfo[2];
        if ($type === IMAGETYPE_JPEG) {
            $ext = 'jpg';
        } elseif ($type === IMAGETYPE_PNG) {
            $ext = 'png';
        } elseif ($type === IMAGETYPE_GIF) {
            $ext = 'gif';
        } elseif (defined('IMAGETYPE_WEBP') && $type === IMAGETYPE_WEBP) {
            $ext = 'webp';
        } elseif (defined('IMAGETYPE_AVIF') && $type === IMAGETYPE_AVIF) {
            $ext = 'avif';
        }
    }
}

if (!$ext) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Неподдерживаемый формат. Используйте JPEG, PNG, WEBP, GIF или AVIF.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = bin2hex(random_bytes(8)) . '.' . $ext;
$path = $uploadDir . '/' . $name;

if (!move_uploaded_file($file['tmp_name'], $path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Не удалось сохранить файл на сервере'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'url' => '/uploads/' . $name
], JSON_UNESCAPED_UNICODE);
