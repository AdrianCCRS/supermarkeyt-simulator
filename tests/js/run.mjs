// Pruebas de la lógica del juego (sin navegador). Uso: node tests/js/run.mjs
// Compara Pricing.calcular() con el PricingService de PHP sobre cestas aleatorias y prueba Venta.
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ctx = vm.createContext({ Intl, console, setTimeout });
for (const f of ['money.js', 'pricing.js', 'venta.js', 'auditoria.js', 'cobro.js', 'compra.js', 'reloj.js', 'phaser/assets.js']) {
    const codigo = fs.readFileSync(path.join(raiz, 'public/assets/js', f), 'utf8').replace(/^const (\w+) =/gm, 'globalThis.$1 =');
    vm.runInContext(codigo, ctx);
}
const { Money, Pricing, Venta, Auditoria, Cobro, Compra, Reloj, PRODUCTOS_DEMO } = ctx;
const skus = Object.keys(PRODUCTOS_DEMO);

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('  FALLO:', msg); } };

// 1) Pricing vs PHP
let seed = 12345; const rnd = (n) => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n;
for (let t = 0; t < 300; t++) {
    const lineas = [];
    const usados = new Set();
    const n = 1 + rnd(8);
    while (lineas.length < n) {
        const sku = skus[rnd(skus.length)];
        if (usados.has(sku)) { continue; }
        usados.add(sku);
        const p = PRODUCTOS_DEMO[sku];
        lineas.push({ sku, cantidad: 1 + rnd(t % 5 === 0 ? 40 : 6), precio_base: p.precio_base, iva_pct: p.iva_pct });
    }
    const php = JSON.parse(execFileSync('php', [path.join(raiz, 'tests/js/pricing_cli.php')], { input: JSON.stringify(lineas) }).toString());
    const js = Pricing.calcular(lineas);
    const igual = Money.fromCents(js.total) === php.total && Money.fromCents(js.descuento) === php.descuento_total
        && Money.fromCents(js.iva) === php.iva_total && Money.fromCents(js.subtotal) === php.subtotal
        && js.detalle.every((d, i) => Money.fromCents(d.total) === php.detalles[i].total_linea);
    ok(igual, 'cesta ' + t + ' ' + JSON.stringify(lineas) + ' JS=' + Money.fromCents(js.total) + ' PHP=' + php.total);
}
console.log('Pricing vs PHP: 300 cestas comparadas');

// 2) Venta
// Catálogo FIJO de pruebas (no depende de los precios del juego, que pueden cambiar): nombre, precio e IVA
const FIJO = {
    'FRU-001': ['2500.00', '0.00'], 'FRU-002': ['1800.00', '0.00'], 'FRU-003': ['2300.00', '0.00'], 'LAC-001': ['1150.00', '0.00'],
    'LAC-002': ['2350.00', '0.00'], 'LAC-003': ['4900.00', '5.00'], 'CAR-001': ['5750.00', '5.00'], 'CAR-002': ['6400.00', '5.00'],
    'CAR-003': ['8950.00', '5.00'], 'DES-001': ['1950.00', '5.00'], 'DES-002': ['1250.00', '5.00'], 'DES-003': ['7800.00', '5.00'],
    'BEB-001': ['750.00', '5.00'], 'BEB-002': ['2100.00', '19.00'], 'BEB-003': ['2650.00', '5.00'], 'PAN-001': ['2200.00', '5.00'],
    'PAN-002': ['950.00', '0.00'], 'LIM-001': ['6500.00', '19.00'], 'LIM-002': ['3400.00', '19.00'], 'HIG-001': ['3150.00', '19.00']
};
const resolver = (sku) => ({ sku, nombre: sku, precio_base: FIJO[sku][0], iva_pct: FIJO[sku][1] });
let v = Venta.crear(resolver);
ok(v.vacia() && v.total() === 0, 'venta nueva vacía');
ok(v.cobrar(100000).motivo === 'NADA QUE COBRAR', 'no se cobra una venta vacía');
let r = v.agregar('BEB-002', 1);                          // 2100 + 19 % = 2499
ok(r.ok && Money.fromCents(r.delta) === '2499.00', 'precio con IVA de un producto: ' + r.delta);
r = v.agregar('FRU-001', 2);                              // 2 kg x 2500 = 5000, sin IVA
ok(Money.fromCents(r.delta) === '5000.00' && Money.fromCents(v.total()) === '7499.00', 'acumulado');
r = v.agregar('BEB-002', 1);                              // el IVA se redondea por LÍNEA: 2 x 2100 = 4200 + 798
ok(Money.fromCents(v.ticket().detalle.find((d) => d.sku === 'BEB-002').total) === '4998.00', 'IVA por línea');
r = v.quitar('BEB-002', 1);
ok(Money.fromCents(r.delta) === '2499.00' && Money.fromCents(v.total()) === '7499.00', 'quitar devuelve el acumulado');
const c1 = v.cobrar(7000 * 100);
ok(!c1.ok && c1.motivo === 'INSUFICIENTE' && Money.fromCents(c1.faltan) === '499.00', 'efectivo insuficiente');
ok(!v.pagada, 'sigue sin pagar');
const c2 = v.cobrar(10000 * 100);
ok(c2.ok && Money.fromCents(c2.cambio) === '2501.00' && v.pagada, 'cobro con cambio');
ok(!v.agregar('PAN-002', 1).ok && !v.quitar('FRU-001', 1).ok, 'tras cobrar la venta queda bloqueada');
ok(!v.cobrar(10000 * 100).ok, 'no se cobra dos veces');
ok(JSON.stringify(v.carrito()) === JSON.stringify({ 'BEB-002': 1, 'FRU-001': 2 }), 'carrito para la API');
// descuento del 5 % a partir de 100.000
v = Venta.crear(resolver);
v.agregar('LIM-001', 15);                                  // 15 x 6500 = 97.500 + 19 % = 116.025
const t = v.ticket();
ok(t.descuento > 0 && t.total === t.bruto - t.descuento, 'descuento por compra grande: ' + Money.fromCents(t.total));
// inventario de compra del cliente
ok(Venta.coincide({ 'LAC-002': 6, 'FRU-001': 2 }, { 'FRU-001': 2, 'LAC-002': 6 }), 'carrito igual a la compra (sin importar el orden)');
ok(!Venta.coincide({ 'LAC-002': 5, 'FRU-001': 2 }, { 'LAC-002': 6, 'FRU-001': 2 }), 'faltan unidades');
ok(!Venta.coincide({ 'LAC-002': 6 }, { 'LAC-002': 6, 'FRU-001': 2 }), 'falta un producto');
ok(!Venta.coincide({ 'LAC-002': 6, 'FRU-001': 2, 'PAN-002': 1 }, { 'LAC-002': 6, 'FRU-001': 2 }), 'sobra un producto');
console.log('Venta: ' + (pruebas - 300) + ' comprobaciones');

// 3) Auditoría: lo que el cliente se lleva frente a lo que el tendero cobró
const n0 = pruebas;
const compra = { 'LAC-002': 6, 'LAC-001': 1, 'FRU-001': 2 };
let l = Auditoria.liquidar(compra, { ...compra }, resolver);
ok(l.exacta && l.perdida === 0 && l.sobrecobro === 0, 'venta exacta: sin pérdida ni sobrecobro');
l = Auditoria.liquidar(compra, { 'LAC-002': 6, 'FRU-001': 2 }, resolver);            // la leche salió sin cobrarse
ok(!l.exacta && l.faltantes['LAC-001'] === 1 && Money.fromCents(l.perdida) === '1150.00' && l.sobrecobro === 0, 'producto sin cobrar = pérdida: ' + Money.fromCents(l.perdida));
l = Auditoria.liquidar(compra, { 'LAC-002': 5, 'LAC-001': 1, 'FRU-001': 2 }, resolver); // QTY de menos
ok(l.faltantes['LAC-002'] === 1 && Money.fromCents(l.perdida) === '2350.00', 'QTY de menos = pérdida');
l = Auditoria.liquidar(compra, { 'LAC-002': 9, 'LAC-001': 1, 'FRU-001': 2 }, resolver); // QTY de más
ok(l.sobrantes['LAC-002'] === 3 && Money.fromCents(l.sobrecobro) === '7050.00' && l.perdida === 0, 'QTY de más = sobrecobro: ' + Money.fromCents(l.sobrecobro));
l = Auditoria.liquidar(compra, { 'LAC-002': 6, 'LAC-001': 1, 'FRU-002': 2 }, resolver); // manzanas cobradas como bananas
ok(l.faltantes['FRU-001'] === 2 && l.sobrantes['FRU-002'] === 2 && Money.fromCents(l.perdida) === '5000.00' && Money.fromCents(l.sobrecobro) === '3600.00', 'fruta cobrada como otra: pérdida y sobrecobro');
l = Auditoria.liquidar({ 'BEB-002': 2 }, { 'BEB-002': 1 }, resolver);               // con IVA: 2100 + 19 %
ok(Money.fromCents(l.perdida) === '2499.00', 'la pérdida se valora con IVA');
// jornada
const j = Auditoria.jornada('60000.00');
j.registrar(Auditoria.liquidar(compra, { ...compra }, resolver), 14100 * 100);
j.registrar(Auditoria.liquidar(compra, { 'LAC-002': 6, 'FRU-001': 2 }, resolver), 19000 * 100);
j.registrar(Auditoria.liquidar(compra, { 'LAC-002': 9, 'LAC-001': 1, 'FRU-001': 2 }, resolver), 21000 * 100);
let rj = j.resumen();
ok(rj.clientes === 3 && rj.exactas === 1 && rj.protestas === 1 && rj.puntos === 100 - 50, 'puntos: +100 exacta, -50 protesta (' + rj.puntos + ')');
ok(Money.fromCents(rj.perdida) === '1150.00' && Money.fromCents(rj.sueldo) === '58850.00' && Money.fromCents(rj.descuento) === '1150.00', 'sueldo = base - pérdidas');
const j2 = Auditoria.jornada('1000.00'); j2.registrar(Auditoria.liquidar({ 'LIM-001': 5 }, {}, resolver), 0);
ok(j2.resumen().sueldo === 0, 'el sueldo nunca baja de 0');
console.log('Auditoría: ' + (pruebas - n0) + ' comprobaciones');

// 4) Cuadre de caja y cobro
const n1 = pruebas;
let cc = Auditoria.cuadreCaja(5000000, 5000000, 1139900);
ok(cc.perdida === 0 && !cc.protesta, 'efectivo tecleado = real: cuadra');
cc = Auditoria.cuadreCaja(5000000, 10000000, 1139900);                      // tecleó 100.000 y eran 50.000
ok(Money.fromCents(cc.perdida) === '50000.00' && !cc.protesta, 'cambio de MÁS = pérdida de caja: ' + Money.fromCents(cc.perdida));
cc = Auditoria.cuadreCaja(5000000, 2000000, 1139900);                       // tecleó 20.000 y eran 50.000
ok(cc.perdida === 0 && cc.protesta, 'cambio de MENOS = el cliente protesta');
const jc = Auditoria.jornada('60000.00');
let rc = jc.registrar(Auditoria.liquidar({ 'PAN-002': 1 }, { 'PAN-002': 1 }, resolver), 95000, Auditoria.cuadreCaja(200000, 300000, 95000));
let sc = jc.resumen();
ok(!rc.exacta && !rc.protesta && sc.perdida_caja === 100000 && sc.perdida === 100000, 'la pérdida de caja entra en el sueldo');
rc = jc.registrar(Auditoria.liquidar({ 'PAN-002': 1 }, { 'PAN-002': 1 }, resolver), 95000, Auditoria.cuadreCaja(500000, 200000, 95000));
ok(rc.protesta && !rc.exacta, 'cambio de menos cuenta como protesta');
// billetes: cubren el total, ≤ 5 billetes y ≤ 3 denominaciones
let semilla = 7; const rnd2 = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
let todoBien = true;
for (let i = 0; i < 400 && todoBien; i++) {
    const total = 50 + rnd(60000000);                                       // hasta 600.000,00 en centavos
    const b = Cobro.generarBilletes(total, rnd2);
    const tipos = Object.keys(b.cuentas).length, n = Object.values(b.cuentas).reduce((x, y) => x + y, 0);
    const suma = Object.entries(b.cuentas).reduce((a, [v, c]) => a + v * c * 100, 0);
    todoBien = b.suma >= total && suma === b.suma && tipos <= 3 && (n <= 5 || b.cuentas[100000] === n);
    if (!todoBien) { ok(false, 'billetes mal para ' + total + ': ' + JSON.stringify(b)); }
}
ok(todoBien, '400 totales aleatorios: los billetes cubren el total, con ≤5 billetes y ≤3 tipos');
ok(Cobro.generarBilletes(1139900, rnd2).suma >= 1139900 && Cobro.generarBilletes(1139900, () => 0).suma === 1200000, 'para 11.399$ lo más justo son 12.000$');
// desglose del cambio: suma exacta, mayor a menor, el resto son monedas (< 2.000$)
{
    let bien = true;
    for (let i = 0; i < 500 && bien; i++) {
        const c = rnd(60000000);
        const d = Cobro.desglosarCambio(c);
        const suma = d.billetes.reduce((a, v) => a + v * 100, 0) + d.monedas;
        const orden = d.billetes.every((v, k) => k === 0 || d.billetes[k - 1] >= v);
        bien = suma === c && orden && d.monedas < 200000 && d.monedas >= 0;
        if (!bien) { ok(false, 'desglose mal para ' + c + ': ' + JSON.stringify(d)); }
    }
    ok(bien, '500 cambios aleatorios: el desglose suma exacto, va de mayor a menor y deja < 2.000$ en monedas');
    const e = Cobro.desglosarCambio(365000);
    ok(JSON.stringify(e.billetes) === '[2000]' && e.monedas === 165000, 'cambio 3.650$ = un billete de 2K + 1.650$ en monedas');
    ok(Cobro.desglosarCambio(0).billetes.length === 0 && Cobro.desglosarCambio(0).monedas === 0, 'cambio 0: nada que dar');
}
// compras aleatorias de los clientes
{
    const skus = Object.keys(PRODUCTOS_DEMO), plu = new Set(Object.values(ctx.PLU));
    const esFruta = (s) => plu.has(s);
    let bien = true, distintas = new Set();
    for (let i = 0; i < 500 && bien; i++) {
        const c = Compra.generar({ skus, esFruta, rnd: rnd2 });
        const ks = Object.keys(c);
        const piezas = ks.reduce((a, k) => a + (esFruta(k) ? 1 : c[k]), 0);
        bien = ks.length >= 2 && ks.length <= 5 && piezas <= 12 && ks.every((k) => skus.includes(k) && Number.isInteger(c[k]) && c[k] >= 1 && c[k] <= (esFruta(k) ? 3 : 4));
        distintas.add(JSON.stringify(c));
        if (!bien) { ok(false, 'compra mal: ' + JSON.stringify(c)); }
    }
    ok(bien && distintas.size > 100, '500 compras aleatorias válidas (2-5 productos, ≤12 piezas, frutas 1-3 kg) y variadas: ' + distintas.size + ' distintas');
    ok(Object.keys(Compra.generar({ skus: ['A'], esFruta, rnd: rnd2 })).length === 1 && Object.keys(Compra.generar({ skus: [], esFruta })).length === 0, 'catálogo corto o vacío no rompe');
}
// reloj de la jornada: 08:00-20:00 repartido en la duración real
{
    const r = Reloj.crear({ inicio: '08:00', fin: '20:00', duracionMs: 600000 });
    ok(r.texto() === '08:00' && !r.terminado(), 'reloj: empieza a las 08:00');
    r.avanzar(300000);
    ok(r.texto() === '14:00' && Math.abs(r.progreso() - 0.5) < 1e-9, 'reloj: a la mitad son las 14:00');
    r.avanzar(2500);
    ok(r.texto() === '14:03', 'reloj: 2,5 s reales = 3 min de juego (' + r.texto() + ')');
    r.avanzar(10000000);
    ok(r.texto() === '20:00' && r.terminado(), 'reloj: no pasa de las 20:00 y avisa que terminó');
    r.reiniciar();
    ok(r.texto() === '08:00' && !r.terminado(), 'reloj: reiniciar vuelve a las 08:00');
}
// cobrador local (mock de checkout.php)
const cobrar = Cobro.local(resolver, 0);
const exito = await cobrar({ carrito: { 'BEB-002': 1, 'FRU-001': 2 }, efectivo: 1000000 });
ok(exito.total === 749900 && exito.cambio === 250100, 'cobrador local: total y cambio');
let rechazo = null; try { await cobrar({ carrito: { 'BEB-002': 1 }, efectivo: 100000 }); } catch (e) { rechazo = e; }
ok(rechazo && rechazo.status === 422, 'cobrador local: efectivo insuficiente = 422 y no cobra');
// asegurar(): los billetes siempre cubren la cuenta actual, aunque la cuenta cambie
let dinero = null;
const rnd3 = () => 0.5;
dinero = Cobro.asegurar(dinero, 114000, rnd3);
const misma = Cobro.asegurar(dinero, 114000, rnd3);
ok(misma === dinero, 'misma cuenta: el cliente conserva sus billetes');
const mayor = Cobro.asegurar(dinero, 1659900, rnd3);                                  // la cuenta subió de 1.140 a 16.599
ok(mayor !== dinero && mayor.suma >= 1659900 && mayor.paraTotal === 1659900, 'cuenta mayor: saca billetes nuevos que la cubren (' + Money.fromCents(mayor.suma) + ')');
const menor = Cobro.asegurar(mayor, 114000, rnd3);                                    // la cuenta bajó: los de antes sobrarían, pero eran para otro total
ok(menor.suma >= 114000 && menor.paraTotal === 114000, 'cuenta menor: billetes ajustados a la cuenta nueva');
let alcanzan = true;
for (let i = 0; i < 300; i++) {                                                       // cuentas que cambian una y otra vez
    const total = 100 + rnd(50000000);
    dinero = Cobro.asegurar(dinero, total, rnd2);
    if (dinero.suma < total) { alcanzan = false; ok(false, 'no alcanza: ' + total + ' ' + JSON.stringify(dinero)); break; }
}
ok(alcanzan, '300 cambios de cuenta seguidos: los billetes siempre cubren el total');
console.log('Cobro: ' + (pruebas - n1) + ' comprobaciones');

console.log(fallos ? '\n' + fallos + ' FALLOS de ' + pruebas : '\nTodo correcto (' + pruebas + ' comprobaciones)');
process.exit(fallos ? 1 : 0);
