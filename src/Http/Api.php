<?php

/**
 * Utilidades mínimas para los endpoints JSON de public/api/.
 *
 * Formato de respuesta:
 *   éxito: {"success": true,  "data": ...}
 *   error: {"success": false, "error": "mensaje"}
 */
class Api
{
    private const MAX_BODY_BYTES = 65536;

    /**
     * Ejecuta un endpoint: valida el método, convierte excepciones en
     * respuestas HTTP coherentes y siempre responde JSON.
     *
     *   400 JSON malformado / ApiException
     *   405 método no permitido
     *   409 conflicto de negocio (stock, jornada cerrada)
     *   422 datos inválidos
     *   500 error interno (el detalle solo se escribe en el log)
     */
    public static function handle(string $method, callable $action, int $successStatus = 200): never
    {
        ini_set('display_errors', '0');
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');

        try {
            if ($_SERVER['REQUEST_METHOD'] !== $method) {
                header("Allow: $method");
                throw new ApiException(405, 'Método no permitido');
            }

            self::send($successStatus, ['success' => true, 'data' => $action()]);
        } catch (ApiException $e) {
            self::send($e->status, ['success' => false, 'error' => $e->getMessage()]);
        } catch (PDOException $e) {
            // PDOException extiende RuntimeException: debe capturarse antes.
            error_log('DB error: ' . $e->getMessage());
            self::send(500, ['success' => false, 'error' => 'Error interno del servidor']);
        } catch (InvalidArgumentException $e) {
            self::send(422, ['success' => false, 'error' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            self::send(409, ['success' => false, 'error' => $e->getMessage()]);
        } catch (Throwable $e) {
            error_log(get_class($e) . ': ' . $e->getMessage());
            self::send(500, ['success' => false, 'error' => 'Error interno del servidor']);
        }
    }

    /** Lee el cuerpo de la petición como un objeto JSON (array asociativo). */
    public static function jsonBody(): array
    {
        $raw = file_get_contents('php://input', false, null, 0, self::MAX_BODY_BYTES + 1);

        if ($raw === false || trim($raw) === '') {
            throw new ApiException(400, 'El cuerpo de la petición está vacío');
        }
        if (strlen($raw) > self::MAX_BODY_BYTES) {
            throw new ApiException(413, 'El cuerpo de la petición es demasiado grande');
        }

        try {
            $data = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException(400, 'JSON inválido');
        }

        if (!is_array($data) || array_is_list($data) && $data !== []) {
            throw new ApiException(400, 'Se esperaba un objeto JSON');
        }

        return $data;
    }

    private static function send(int $status, array $payload): never
    {
        http_response_code($status);
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }
}

class ApiException extends Exception
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}
