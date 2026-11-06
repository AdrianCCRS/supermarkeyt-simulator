<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/PricingServiceTest.php';
require __DIR__ . '/CheckoutServiceTest.php';
require __DIR__ . '/ApiTest.php';

printf("\n%d passed, %d failed, %d skipped\n", T::$passed, T::$failed, T::$skipped);

// Por defecto, una prueba omitida cuenta como fallo: así un "verde" siempre
// significa que TODO se ejecutó. Usa --allow-skip solo para correr lo que se pueda.
$allowSkip = in_array('--allow-skip', $argv, true);
if (T::$skipped > 0 && !$allowSkip) {
    echo "Pruebas omitidas: instala pdo_mysql/mbstring y configura MySQL (o usa --allow-skip).\n";
}
exit(T::$failed > 0 || (T::$skipped > 0 && !$allowSkip) ? 1 : 0);
