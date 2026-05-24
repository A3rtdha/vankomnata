<?php
header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_use_only_cookies', 1);
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', 1);
    }
    session_start();
}

// Список разрешенных пользователей и хэшей их паролей.
// Хэш ниже сгенерирован для пароля "admin123".
$allowed_users = [
    'admin' => '$2y$12$9trNO8YpUQ1ocfp86ITJZOOsBfNI.L7w7eo103/VDstU5PkQXF0UO'
];

// УТИЛИТА ГЕНЕРАЦИИ ХЭША:
// Если вам нужно задать менеджеру другой пароль, временно перейдите по адресу:
// http://localhost:8000/api/auth.php?generate_hash=НОВЫЙ_ПАРОЛЬ, скопируйте результат и вставьте в массив выше.
if (isset($_GET['generate_hash']) && !empty($_GET['generate_hash'])) {
    echo json_encode([
        'hash' => password_hash($_GET['generate_hash'], PASSWORD_DEFAULT)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET — проверка, авторизован ли пользователь в данный момент
if ($method === 'GET') {
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        echo json_encode([
            'authenticated' => true,
            'user' => $_SESSION['admin_user']
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['authenticated' => false], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// POST — логин или логаут
if ($method === 'POST') {
    // 1. Обработка Выхода (Logout)
    if (isset($_GET['action']) && $_GET['action'] === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        session_destroy();
        echo json_encode(['success' => true, 'message' => 'Вы успешно вышли'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 2. Обработка Входа (Login)
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Пожалуйста, заполните все поля'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (isset($allowed_users[$username]) && password_verify($password, $allowed_users[$username])) {
        session_regenerate_id(true);

        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_user'] = $username;

        echo json_encode([
            'success' => true,
            'message' => 'Вход выполнен успешно',
            'user' => $username
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Неверный логин или пароль'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
