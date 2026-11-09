<?php

/**
 * Stock propio de cada jugador. El de `productos.stock` es el stock BASE: con el que empieza cada jugador.
 * Cada jugador tiene una fila por producto en `stock_jugador`, que se crea la primera vez que hace falta.
 */
class StockJugadorRepository
{
    public function __construct(private PDO $pdo) {}

    /** Crea las filas que le falten al jugador (productos nuevos incluidos), copiando el stock base. No toca las que ya existen. */
    public function asegurar(string $jugador): void
    {
        $this->pdo->prepare(
            "INSERT IGNORE INTO stock_jugador (jugador, producto_id, stock)
            SELECT ?, id, stock FROM productos"
        )->execute([$jugador]);
    }
}
