<?php

/** Jugadores del ranking: apodo y puntos acumulados. Nunca devuelve el identificador de nadie hacia fuera. */
class JugadorRepository
{
    public function __construct(private PDO $pdo) {}

    /**
     * Suma los puntos de una jornada al total del jugador (crea su fila si es la primera vez).
     * `actualizado` solo se mueve si realmente suma, para que el desempate premie a quien llegó antes a esa cifra.
     * Se llama dentro de la transacción del cierre.
     */
    public function sumarPuntos(string $jugador, int $puntos): void
    {
        $this->pdo->prepare(
            "INSERT INTO jugadores (id, puntos_total) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                actualizado = IF(VALUES(puntos_total) > 0, CURRENT_TIMESTAMP, actualizado),
                puntos_total = puntos_total + VALUES(puntos_total)"
        )->execute([$jugador, $puntos]);
    }

    /** Crea la fila del jugador si no existe (sin puntos ni apodo). */
    public function asegurar(string $jugador): void
    {
        $this->pdo->prepare("INSERT IGNORE INTO jugadores (id) VALUES (?)")->execute([$jugador]);
    }

    /** Apodo actual y segundos desde el último cambio (null si nunca lo cambió), con la fila bloqueada. */
    public function apodoParaActualizar(string $jugador): array
    {
        $query = $this->pdo->prepare(
            "SELECT apodo, TIMESTAMPDIFF(SECOND, apodo_cambiado, CURRENT_TIMESTAMP) AS segundos
            FROM jugadores WHERE id = ? FOR UPDATE"
        );
        $query->execute([$jugador]);
        $row = $query->fetch(PDO::FETCH_ASSOC);

        return [
            'apodo' => $row['apodo'],
            'segundos' => $row['segundos'] === null ? null : (int) $row['segundos'],
        ];
    }

    /** Guarda el apodo. Lanza PDOException (1062) si otro jugador ya lo tiene. */
    public function fijarApodo(string $jugador, string $apodo): void
    {
        $this->pdo->prepare("UPDATE jugadores SET apodo = ?, apodo_cambiado = CURRENT_TIMESTAMP WHERE id = ?")
            ->execute([$apodo, $jugador]);
    }

    /** Los mejores: solo con apodo y puntos > 0. Mismo orden que `posicion`. */
    public function top(int $limite): array
    {
        $query = $this->pdo->prepare(
            "SELECT apodo, puntos_total AS puntos
            FROM jugadores
            WHERE apodo IS NOT NULL AND puntos_total > 0
            ORDER BY puntos_total DESC, actualizado ASC, id ASC
            LIMIT " . (int) $limite
        );
        $query->execute();

        return $query->fetchAll(PDO::FETCH_ASSOC);
    }

    /** La fila del jugador con su posición (null en la posición si no tiene apodo o no tiene puntos); null si no existe. */
    public function yo(string $jugador): ?array
    {
        $query = $this->pdo->prepare("SELECT id, apodo, puntos_total, actualizado FROM jugadores WHERE id = ?");
        $query->execute([$jugador]);
        $row = $query->fetch(PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }
        $posicion = null;
        if ($row['apodo'] !== null && (int) $row['puntos_total'] > 0) {
            // 1 + los que van por delante según el mismo orden que el top (más puntos, o los mismos pero antes)
            $cuenta = $this->pdo->prepare(
                "SELECT COUNT(*) FROM jugadores
                WHERE apodo IS NOT NULL AND puntos_total > 0
                  AND (puntos_total > :p1
                       OR (puntos_total = :p2 AND (actualizado < :a1 OR (actualizado = :a2 AND id < :id))))"
            );
            $cuenta->execute([
                'p1' => $row['puntos_total'], 'p2' => $row['puntos_total'],
                'a1' => $row['actualizado'], 'a2' => $row['actualizado'], 'id' => $row['id'],
            ]);
            $posicion = 1 + (int) $cuenta->fetchColumn();
        }

        return ['apodo' => $row['apodo'], 'puntos' => (int) $row['puntos_total'], 'posicion' => $posicion];
    }
}
