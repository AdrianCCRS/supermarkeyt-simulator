<?php

// Carga manual de clases (el proyecto no usa Composer).
foreach ([
    'Config/Env',
    'Config/Database',
    'Http/Api',
    'Repositories/StockJugadorRepository',
    'Repositories/ProductoRepository',
    'Repositories/CategoriaRepository',
    'Repositories/VentaRepository',
    'Repositories/JornadaRepository',
    'Services/PricingService',
    'Services/CheckoutService',
    'Services/JornadaService',
    'Services/VentaService',
    'Services/ProductoService',
] as $file) {
    require_once __DIR__ . "/$file.php";
}
