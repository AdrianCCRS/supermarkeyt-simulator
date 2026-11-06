# Cierre de jornada: pérdidas del tendero

Qué hace el juego y qué le tiene que dar el backend (a implementar aparte, junto con el jQuery/AJAX).

## Qué calcula el juego (ya hecho, en el navegador)

Por cada cliente atendido compara lo que **se lleva** (su inventario de compra, `{sku: cantidad}`) con lo que el tendero
**cobró** (`venta.carrito()`), en `public/assets/js/auditoria.js`:

| Concepto | Significa | Efecto |
|---|---|---|
| `faltantes` | unidades que el cliente se llevó y no se cobraron | **pérdida** → se descuenta del sueldo |
| `sobrantes` | unidades cobradas de más (o de otro producto) | **sobrecobro** → el cliente protesta (−50 pts) |
| venta exacta | ni faltantes ni sobrantes | +100 pts |

Los importes se valoran como los cobraría la caja (precio base × cantidad + IVA de la línea).
Sueldo del tendero = `sueldoBase` − pérdidas, con mínimo 0. El sueldo base está en `JORNADA_CONFIG` (`phaser/assets.js`, 60.000 COP).

### Cómo leerlo para el cierre (jQuery)

```js
const r = Juego.resumenJornada();
// {clientes, exactas, protestas, puntos, cobrado, perdida, sobrecobro,
//  faltantes: {"LAC-001": 1, "FRU-001": 2},   // unidades que salieron sin cobrarse
//  sobrantes: {"LAC-002": 3},                 // unidades cobradas de más
//  sueldo_base, sueldo, descuento}            // todos los importes en CENTAVOS
Money.fromCents(r.perdida)   // "7100.00"
```

## Qué necesita el backend (para implementar después)

Hoy `checkout.php` descuenta del stock solo lo que se **cobra**; lo que el cliente se lleva sin cobrarse no se refleja
y el stock de la base de datos queda MÁS ALTO que el real. Propuesta:

1. **`jornada_cerrar.php`** acepta, además de `jornada_id`, las unidades que salieron sin cobrarse y las cobradas de más:
   ```json
   {"jornada_id": 2, "faltantes": {"LAC-001": 1, "FRU-001": 2}, "sobrantes": {"LAC-002": 3}}
   ```
2. Dentro de la misma transacción del cierre:
   - **descontar `faltantes` del stock** (son unidades que ya no están en la tienda) y **reponer `sobrantes`** (se cobraron
     unidades que no salieron, así que siguen en el almacén) — o dejarlo registrado sin tocar el stock si prefieres;
   - guardar el resultado de la jornada, por ejemplo en `jornadas` (`perdida_total`, `sobrecobro_total`) y/o una tabla
     `mermas_jornada (jornada_id, producto_id, cantidad, tipo ENUM('faltante','sobrante'), valor)`.
3. Devolver el resumen de la jornada con esos totales para mostrarlo en el cierre.
4. **Validar en el servidor** (el cliente es de confianza, pero conviene cuadrar): los SKU deben existir, las cantidades ser
   enteros ≥ 1, y los importes recalcularlos con `PricingService` en vez de fiarse de los que envíe el navegador.

Lo que NO hay que cambiar: `checkout.php` sigue recibiendo solo lo cobrado.

## Pendiente del lado del juego
- Mostrar el resumen en una pantalla de cierre (hoy solo está disponible vía `Juego.resumenJornada()`).
- El juego no guarda nada entre recargas: la jornada vive en memoria hasta que el backend la persista.
