<?php
// Безопасный запуск сессии с защитой от XSS-атак (HttpOnly)
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_use_only_cookies', 1);

    // Включаем безопасную передачу кук, если используется HTTPS
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

// Проверяем, авторизован ли сеанс админа
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Доступ запрещен. Требуется авторизация.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
