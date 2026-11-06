<?php

require_once __DIR__ . '/Env.php';

class Database
{
    private static ?PDO $pdo = null;

    /**
     * Devuelve la conexión PDO compartida. Lanza PDOException si falla;
     * quien la llama decide cómo responder (la API lo convierte en un 500).
     */
    public static function connection(): PDO
    {
        if (self::$pdo === null) {
            Env::load(dirname(__DIR__, 2) . '/.env');

            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                Env::get('DB_HOST', '127.0.0.1'),
                Env::get('DB_PORT', '3306'),
                Env::get('DB_NAME', 'supermarket_simulator')
            );

            self::$pdo = new PDO(
                $dsn,
                Env::get('DB_USER', 'root'),
                Env::get('DB_PASS', ''),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]
            );
        }

        return self::$pdo;
    }
}
