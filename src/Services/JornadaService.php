<?php

class JornadaService
{
    private const MYSQL_DUPLICATE_KEY = 1062;

    public function __construct(
        private PDO $pdo,
        private JornadaRepository $jornadas
    ) {}

    /** La jornada abierta de ese jugador con su resumen de ventas, o null si no tiene. */
    public function actual(string $jugador): ?array
    {
        $jornada = $this->jornadas->findAbierta($jugador);

        return $jornada === null ? null : $this->conResumen($jornada);
    }

    /**
     * Abre una jornada para el jugador. Cada jugador puede tener UNA abierta (las de otros no cuentan): lo garantiza
     * el índice único de la BD, así que dos aperturas simultáneas del mismo jugador no pueden coexistir.
     */
    public function abrir(string $jugador): array
    {
        try {
            $id = $this->jornadas->abrir($jugador);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === self::MYSQL_DUPLICATE_KEY) {
                throw new RuntimeException('Ya existe una jornada abierta');
            }
            throw $e;
        }

        return $this->conResumen($this->jornadas->findById($id));
    }

    /**
     * Cierra la jornada. Bloquea su fila, igual que el checkout, así que un
     * cobro en curso termina antes del cierre y ninguno entra después.
     * $faltantes / $sobrantes ({sku: cantidad}) ajustan el stock en la misma transacción, y $perdida / $sobrecobro
     * (importes en texto) quedan guardados en la jornada.
     */
    public function cerrar(
        int $id,
        array $faltantes = [],
        array $sobrantes = [],
        string $perdida = '0.00',
        string $sobrecobro = '0.00'
    ): array
    {
        $this->pdo->beginTransaction();

        try {
            $jornada = $this->jornadas->findByIdForUpdate($id);

            if ($jornada === null) {
                throw new InvalidArgumentException('Jornada no encontrada');
            }
            if ($jornada['estado'] !== 'abierta') {
                throw new RuntimeException('La jornada ya está cerrada');
            }

            $this->jornadas->cerrar($id, $faltantes, $sobrantes, $perdida, $sobrecobro);
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }

        return $this->conResumen($this->jornadas->findById($id));
    }

    private function conResumen(array $jornada): array
    {
        return $jornada + $this->jornadas->resumen((int) $jornada['id']);
    }
}
