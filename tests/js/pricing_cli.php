<?php
// Calcula un ticket con el PricingService REAL. Entrada (stdin): JSON [{sku, cantidad, precio_base, iva_pct}].
require __DIR__ . '/../../src/Services/PricingService.php';
$in = json_decode(stream_get_contents(STDIN), true);
$productos = []; $cant = []; $i = 1;
foreach ($in as $l) {
    $productos[] = ['id' => $i++, 'sku' => $l['sku'], 'nombre' => $l['sku'], 'precio_base' => $l['precio_base'], 'iva_pct' => $l['iva_pct']];
    $cant[$l['sku']] = $l['cantidad'];
}
echo json_encode((new PricingService())->calcularTicket($productos, $cant));
