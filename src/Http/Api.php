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
        header('Cache-Control: no-store');                 // los datos son de cada jugador: que ninguna caché los guarde
        header('Referrer-Policy: no-referrer');

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

    /**
     * El jugador de la petición: un UUID anónimo que el navegador guarda y manda en la cabecera X-Jugador.
     * No es una cuenta: es la llave de SU jornada y de SU stock. Con $obligatorio = false devuelve null si falta.
     */
    public static function jugador(bool $obligatorio = true): ?string
    {
        $id = $_SERVER['HTTP_X_JUGADOR'] ?? null;

        if ($id === null || $id === '') {
            if ($obligatorio) {
                throw new ApiException(400, 'Falta la cabecera X-Jugador');
            }
            return null;
        }
        if (!is_string($id) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
            throw new ApiException(400, 'X-Jugador no es un identificador válido');
        }

        return strtolower($id);
    }

    /** La jornada $id, si es del jugador. Si no existe o es de otro responde 404 igual (no revela que existe). */
    public static function jornadaDe(JornadaRepository $jornadas, int $id, string $jugador): array
    {
        $jornada = $jornadas->findById($id);

        if ($jornada === null || $jornada['jugador'] !== $jugador) {
            throw new ApiException(404, 'Jornada no encontrada');
        }

        return $jornada;
    }

    /** Endpoints de administración (reponer, activar/desactivar): solo con la cabecera X-Admin-Token igual a ADMIN_TOKEN. */
    public static function exigirAdmin(): void
    {
        $token = Env::get('ADMIN_TOKEN');
        $dado = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

        if ($token === null || $token === '' || !is_string($dado) || !hash_equals($token, $dado)) {
            throw new ApiException(403, 'Operación de administración no autorizada');
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
            // Se decodifica sin "assoc" para distinguir {} de []: con arrays
            // asociativos ambos serían un array vacío.
            $decoded = json_decode($raw, false, 8, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException(400, 'JSON inválido');
        }

        if (!$decoded instanceof stdClass) {
            throw new ApiException(400, 'Se esperaba un objeto JSON');
        }

        return json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
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
