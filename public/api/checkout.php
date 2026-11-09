<?php

declare(strict_types=1);

require_once __DIR__ . '/../../src/bootstrap.php';

/*
 * POST /api/checkout.php
 * {
 *   "jornada_id": 2,
 *   "cliente_nombre": "Cliente 1",
 *   "carrito": {"FRU-001": 2, "LAC-001": 1},
 *   "efectivo_recibido": "50000.00"
 * }
 * Los precios y totales NUNCA se leen del cliente: se calculan en el servidor.
 */
Api::handle('POST', function (): array {
    $body = Api::jsonBody();

    $jornadaId = $body['jornada_id'] ?? null;
    $cliente = $body['cliente_nombre'] ?? null;
    $carrito = $body['carrito'] ?? null;
    $efectivo = $body['efectivo_recibido'] ?? null;

    if (!is_int($jornadaId)) {
        throw new ApiException(422, 'jornada_id debe ser un entero');
    }
    if (!is_string($cliente)) {
        throw new ApiException(422, 'cliente_nombre debe ser texto');
    }
    if (!is_array($carrito)) {
        throw new ApiException(422, 'carrito debe ser un objeto {sku: cantidad}');
    }
    if (!is_string($efectivo)) {
        throw new ApiException(422, 'efectivo_recibido debe ser texto con formato "0.00"');
    }

    $jugador = Api::jugador();
    $pdo = Database::connection();
    $jornadas = new JornadaRepository($pdo);
    Api::jornadaDe($jornadas, $jornadaId, $jugador);          // la jornada tiene que ser de este jugador
    $checkout = new CheckoutService(
        $pdo,
        new ProductoRepository($pdo, $jugador),               // y el stock que se mueve es el suyo
        new VentaRepository($pdo),
        $jornadas,
        new PricingService()
    );

    return $checkout->procesarCompra($jornadaId, $cliente, $carrito, $efectivo);
}, 201);
