# Mecánica de pago (solo efectivo) y ciclo del cliente

Plan para cerrar el flujo de una venta: recibir el efectivo, mostrar el cambio, entregar, y que el cliente se vaya y llegue otro.
El backend (`checkout.php`) y el jQuery/AJAX los hace el autor del proyecto: aquí solo se deja el punto de conexión.

## 1. Lo que impone el backend

`POST checkout.php` es **atómico y no idempotente**: valida el efectivo, calcula el cambio, crea la venta y descuenta el stock en una sola llamada.
- Efectivo insuficiente → `422` y **no se crea nada** (se puede reintentar).
- Stock insuficiente / jornada cerrada → `409`, tampoco se crea nada.
- OK → `201` con `total`, `cambio`, `detalles`, `numero_venta`.

Consecuencia: **cobrar de verdad = confirmar el efectivo**. `ENTREGAR` ya es solo el gesto físico de dar la bolsa.

## 2. Flujo del cobro

```
[productos en la bolsa] ──PAY──► A COBRAR (el cliente saca el dinero; aparecen sus billetes en la bandeja)
        │                              │ el tendero LEE los billetes y teclea la suma
        │                              ▼
        │                        PAY otra vez (o ENT) = confirmar ──► cobrador({carrito, efectivo})
        │                                                                 │ 422: FALTAN $x (reintenta)
        │                                                                 │ OK: total + cambio (del backend)
        │                                                                 ▼
        │                                              sale el recibo (animación en la caja grande)
        │                                              pantalla: CAMBIO $x        ENTREGAR se activa
        ▼
   ENTREGAR ──► el cliente coge la bolsa y se va ──► avanza la cola ──► entra el siguiente cliente
```

### Quién decide cuánto paga el cliente
El juego genera el **efectivo real** del cliente (billetes de 2.000 a 100.000 que cubran el total; a veces justo, a veces con billete grande).
Se ven en una **bandeja de efectivo** bajo la caja registradora grande. El tendero tiene que **leerlos y teclear la suma**, y eso es lo que se envía como `efectivo_recibido`.

Errores posibles (misma filosofía de responsabilidad que las pérdidas):

| El tendero teclea… | Qué pasa |
|---|---|
| Menos que el total | el backend responde `422`: `FALTAN $x`, reintenta |
| Más que lo real (pero ≥ total) | calcula un cambio de MÁS → se da de más: **pérdida de caja** al cierre |
| Menos que lo real (pero ≥ total) | cambio de MENOS → el cliente **protesta** (−50 pts) |
| Justo lo real | todo bien |

(`Auditoria` guarda `efectivo_real` y `efectivo_tecleado` para calcular esas diferencias; no hace falta tocar el backend.)

### Los billetes siempre cubren la cuenta
`Cobro.asegurar()` da al cliente billetes que cubren el total **de ese momento**. Si cancelas (`CLR`) y vuelves a cobrar con la misma cuenta, conserva los mismos billetes;
si la cuenta cambió, saca otros. Escanear, pesar o anular (`VOID`) con el cobro abierto **cancela el cobro** (el cliente guarda su dinero y lo vuelve a sacar al pulsar `PAY`),
así el efectivo de la bandeja nunca se queda corto respecto a lo que se va a cobrar.

### Punto de conexión con el backend (lo implementa el autor)
El juego no llama a la API. Pide el cobro a una función que se puede sustituir:

```js
// por defecto (modo local, ya hecho): calcula igual que PricingService
Juego.setCobrador(async ({ carrito, efectivo }) => ({ total, cambio }));   // importes en centavos

// el autor la sustituye por jQuery/AJAX a checkout.php:
Juego.setCobrador(({ carrito, efectivo }) => Api.checkout(jornadaId, cliente, carrito, Money.fromCents(efectivo))
    .then((v) => ({ total: Money.toCents(v.total), cambio: Money.toCents(v.cambio), venta: v })));
// si falla: rechazar con {status, mensaje}; el juego muestra el aviso y deja reintentar (422) o cancela (409)
```
Mientras la petición está en curso el teclado queda bloqueado (la API no es idempotente: un doble PAY crearía dos ventas).

## 3. Ciclo del cliente

| Estado | Qué se ve | Quién lo dispara |
|---|---|---|
| `LLEGANDO` | entra por la izquierda andando de perfil, luego baja por la cola | nuevo cliente |
| `EN_COLA` | espera (respira, cambia de expresión según la paciencia) | — |
| `EN_BANDA` | el primero de la cola descarga sus productos; el resto avanza | llega su turno |
| `PAGANDO` | extiende el brazo con el dinero; los billetes aparecen en la bandeja | `PAY` |
| `COBRADO` | sale el recibo; la pantalla muestra el cambio | cobrador OK |
| `SALIENDO` | coge la bolsa y baja por la izquierda fuera de pantalla, con su expresión final (satisfecho/molesto) | `ENTREGAR` |
| `SIGUIENTE` | la cola avanza un puesto y entra otro cliente con su inventario de compra | fin de `SALIENDO` |

La expresión final depende de la auditoría de esa venta: protesta (sobrecobro, cambio de menos) → molesto; exacta → satisfecho.

## 4. Animaciones de caja (zoom)
- **Recibo:** al confirmar el pago sale un ticket por la ranura de la impresora y cuelga por delante de la impresora, con rayitas que imitan texto (no es la factura final). Al `ENTREGAR` se arranca y desaparece.
- **Billetes:** aparecen en la bandeja al `PAY`, y desaparecen al cobrar (pasan al cajón).

## 5. Estado

**Hecho (fase 1, solo mecánica, sin jQuery ni AJAX):**
- `cobro.js`: billetes del cliente (cubren el total, ≤5 billetes y ≤3 valores) y cobrador local que imita a `checkout.php`.
- `Juego.setCobrador(fn)` / `Juego.cobrar(pedido)` en `config.js`. **Aquí se conecta el backend** (ver §2); `app.js` no se ha tocado.
- `PAY` en dos pasos, bandeja con billetes, teclado bloqueado mientras se espera la respuesta, `FALTAN $x` en 422, recibo (placeholder), cambio en pantalla.
- `Auditoria.cuadreCaja`: cambio de más = pérdida de caja (entra en el sueldo); cambio de menos = el cliente protesta.
- Ciclo del cliente: coge la bolsa y sale, la cola avanza, entra otro por la izquierda con su inventario.
- Si existen las hojas de animación (`characters/cliente-N-anim.png`, `cajero-anim.png`) y las de la caja (`recibo-*`, `billetes`, `bandeja-efectivo`, `libro`), se usan solas; si no, placeholders y deslizamientos.

**Pendiente:** el arte (prompts ya dados), y conectar `setCobrador` al backend.

## 6. Fases de implementación
1. **Lógica con placeholders** (sin esperar el arte): `Cobrador` local, bandeja y billetes de colores, recibo como rectángulo, cliente que sale y entra deslizándose, `Auditoria` con efectivo real vs tecleado.
2. **Arte** (prompts en la conversación): animaciones de cliente y de cajero; recibo, billetes, bandeja y libro.
3. **Sustituir placeholders** por el arte real (se cargan por clave, sin tocar la lógica).
4. **Backend:** el autor conecta `setCobrador` a `checkout.php`.
