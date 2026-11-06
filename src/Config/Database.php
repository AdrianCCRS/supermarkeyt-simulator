<?php
require_once __DIR__ . '/Env.php';
Env::load(dirname(__DIR__, 2) . '/.env');

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        Env::get('DB_HOST', '127.0.0.1'),
        Env::get('DB_PORT', '3306'),
        Env::get('DB_NAME', 'supermarket_simulator')
    );
    $pdo = new PDO($dsn, Env::get('DB_USER', 'root'), Env::get('DB_PASS', ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo 'Database connection error.';
    exit;
}
