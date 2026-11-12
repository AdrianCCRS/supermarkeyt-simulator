<?php

/**
 * Límite de peticiones por IP con un contador en la base (ventana fija de un minuto). Sin dependencias nuevas.
 * Es un freno barato contra el abuso desde un mismo origen, no una defensa contra un ataque distribuido:
 * para eso está el límite de Cloudflare (docs/PUBLICAR.md).
 */
class LimitePeticiones
{
    private const VENTANA_SEGUNDOS = 60;

    /**
     * Cuenta una petición de esta IP en el grupo $grupo y responde 429 si pasa de $maximo por minuto.
     */
    public static function exigir(PDO $pdo, string $grupo, int $maximo, ?string $ip = null, ?int $ahora = null): void
    {
        $clave = sha1($grupo . '|' . self::clave($ip ?? self::ip()));
        $ventana = intdiv($ahora ?? time(), self::VENTANA_SEGUNDOS);

        // Asignaciones de izquierda a derecha: `n` se evalúa con la ventana ANTERIOR, antes de que se actualice
        $pdo->prepare(
            "INSERT INTO limite_peticiones (clave, ventana, n) VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE n = IF(ventana = VALUES(ventana), n + 1, 1), ventana = VALUES(ventana)"
        )->execute([$clave, $ventana]);

        $query = $pdo->prepare("SELECT n FROM limite_peticiones WHERE clave = ?");
        $query->execute([$clave]);

        if ((int) $query->fetchColumn() > $maximo) {
            throw new ApiException(429, 'Demasiadas peticiones; espera un momento');
        }
    }

    /**
     * IP del cliente. Detrás de Cloudflare Tunnel la conexión llega desde cloudflared (loopback o red privada del
     * contenedor) y la IP real viene en CF-Connecting-IP, que Cloudflare siempre sobrescribe. Solo se confía en esa
     * cabecera si la conexión directa es local/privada: el puerto del juego solo escucha en 127.0.0.1, así que
     * un visitante de internet no puede llegar directo para falsificarla.
     */
    public static function ip(): string
    {
        $remota = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $cf = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? '');

        $publica = filter_var($remota, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
        if (!$publica && filter_var($cf, FILTER_VALIDATE_IP) !== false) {
            return $cf;
        }

        return $remota;
    }

    /** IPv4 completa; en IPv6, el prefijo /64 (una persona suele tener un /64 entero y rotaría dentro de él). */
    private static function clave(string $ip): string
    {
        $bin = @inet_pton($ip);

        return $bin !== false && strlen($bin) === 16 ? substr($bin, 0, 8) : ($bin !== false ? $bin : $ip);
    }
}
