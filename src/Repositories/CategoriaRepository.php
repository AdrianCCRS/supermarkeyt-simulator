<?php

class CategoriaRepository
{
    public function __construct(private PDO $pdo) {}

    public function getAll(): array
    {
        $query = $this->pdo->query(
            "SELECT id, nombre, descripcion
            FROM categorias
            ORDER BY nombre"
        );

        return $query->fetchAll(PDO::FETCH_ASSOC);
    }
}
