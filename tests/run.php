<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/PricingServiceTest.php';
require __DIR__ . '/CheckoutServiceTest.php';

printf("\n%d passed, %d failed, %d skipped\n", T::$passed, T::$failed, T::$skipped);
exit(T::$failed > 0 ? 1 : 0);
