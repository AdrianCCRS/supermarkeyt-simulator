<?php

// Carga manual de clases (el proyecto no usa Composer).
foreach ([
    'Config/Env',
    'Config/Database',
    'Http/Api',
    'Http/LimitePeticiones',
    'Repositories/StockJugadorRepository',
    'Repositories/ProductoRepository',
    'Repositories/CategoriaRepository',
    'Repositories/VentaRepository',
    'Repositories/JornadaRepository',
    'Repositories/JugadorRepository',
    'Services/PricingService',
    'Services/CheckoutService',
    'Services/JornadaService',
    'Services/VentaService',
    'Services/ProductoService',
    'Services/RankingService',
] as $file) {
    require_once __DIR__ . "/$file.php";
}
