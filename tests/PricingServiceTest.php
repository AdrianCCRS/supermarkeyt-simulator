<?php
echo "PricingService\n";

function prod(string $sku, string $precio, string $iva, int $id = 1): array
{
    return ['id' => $id, 'sku' => $sku, 'nombre' => $sku, 'precio_base' => $precio, 'iva_pct' => $iva];
}

$svc = new PricingService();

T::test('calcula subtotal, IVA y total de una línea', function () use ($svc) {
    $t = $svc->calcularTicket([prod('A', '1000.00', '19.00')], ['A' => 3]);
    T::same('3000.00', $t['subtotal']);
    T::same('570.00', $t['iva_total']);
    T::same('3570.00', $t['total']);
});

T::test('redondea el IVA half-up', function () use ($svc) {
    // 0.10 * 5% = 0.005 -> 0.01
    $t = $svc->calcularTicket([prod('A', '0.10', '5.00')], ['A' => 1]);
    T::same('0.01', $t['iva_total']);
    // 0.09 * 5% = 0.0045 -> 0.00
    $t = $svc->calcularTicket([prod('A', '0.09', '5.00')], ['A' => 1]);
    T::same('0.00', $t['iva_total']);
});

T::test('IVA 0% no suma impuesto', function () use ($svc) {
    $t = $svc->calcularTicket([prod('A', '2500.00', '0.00')], ['A' => 2]);
    T::same('0.00', $t['iva_total']);
    T::same('5000.00', $t['total']);
});

T::test('suma varias líneas', function () use ($svc) {
    $t = $svc->calcularTicket(
        [prod('A', '1150.00', '0.00', 1), prod('B', '4900.00', '5.00', 2)],
        ['A' => 2, 'B' => 1]
    );
    T::same('7200.00', $t['subtotal']);
    T::same('245.00', $t['iva_total']);
    T::same('7445.00', $t['total']);
    T::same(2, count($t['detalles']));
});

T::test('rechaza cantidad cero, negativa o no entera', function () use ($svc) {
    foreach ([0, -1, '2', 1.5] as $q) {
        T::throws(InvalidArgumentException::class,
            fn() => $svc->calcularTicket([prod('A', '1.00', '0.00')], ['A' => $q]),
            'cantidad ' . var_export($q, true));
    }
});

T::test('rechaza cantidad por encima del máximo por línea', function () use ($svc) {
    T::throws(InvalidArgumentException::class, fn() =>
        $svc->calcularTicket([prod('A', '1.00', '0.00')],
            ['A' => PricingService::MAX_CANTIDAD_POR_LINEA + 1]));
});

T::test('acepta justo la cantidad máxima', function () use ($svc) {
    $t = $svc->calcularTicket([prod('A', '1.00', '0.00')],
        ['A' => PricingService::MAX_CANTIDAD_POR_LINEA]);
    T::same('1000.00', $t['total']);
});

T::test('rechaza importes que superarían DECIMAL(12,2) (sin desbordar int)', function () use ($svc) {
    T::throws(InvalidArgumentException::class, fn() =>
        $svc->calcularTicket([prod('A', '9999999999.99', '19.00')], ['A' => 1000]));
    T::throws(InvalidArgumentException::class, fn() =>
        $svc->calcularTicket([prod('A', '9999999999.99', '100.00')], ['A' => 1]));
});

T::test('rechaza formatos decimales inválidos', function () use ($svc) {
    foreach (['10', '10.5', '-1.00', 'abc', '99999999999.00'] as $p) {
        T::throws(InvalidArgumentException::class,
            fn() => $svc->calcularTicket([prod('A', $p, '0.00')], ['A' => 1]), $p);
    }
});
