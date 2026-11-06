<?php

// Carga manual de clases (el proyecto no usa Composer).
foreach ([
    'Config/Env',
    'Config/Database',
    'Http/Api',
    'Repositories/ProductoRepository',
    'Repositories/VentaRepository',
    'Repositories/JornadaRepository',
    'Services/PricingService',
    'Services/CheckoutService',
] as $file) {
    require_once __DIR__ . "/$file.php";
}
