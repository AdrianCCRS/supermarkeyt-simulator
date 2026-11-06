<?php

class JornadaService
{
    private const MYSQL_DUPLICATE_KEY = 1062;

    public function __construct(
        private PDO $pdo,
        private JornadaRepository $jornadas
    ) {}

    /** La jornada abierta con su resumen de ventas, o null si no hay. */
    public function actual(): ?array
    {
        $jornada = $this->jornadas->findAbierta();

        return $jornada === null ? null : $this->conResumen($jornada);
    }

    /**
     * Abre una jornada. Solo puede haber una abierta: lo garantiza el índice
     * único de la BD, así que dos aperturas simultáneas no pueden coexistir.
     */
    public function abrir(): array
    {
        try {
            $id = $this->jornadas->abrir();
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
     */
    public function cerrar(int $id): array
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

            $this->jornadas->cerrar($id);
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
