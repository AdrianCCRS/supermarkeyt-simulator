// Pruebas de la lógica del juego (sin navegador). Uso: node tests/js/run.mjs
// Compara Pricing.calcular() con el PricingService de PHP sobre cestas aleatorias y prueba Venta.
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ctx = vm.createContext({ Intl, console, setTimeout });
for (const f of ['money.js', 'pricing.js', 'venta.js', 'auditoria.js', 'cobro.js', 'compra.js', 'reloj.js', 'paciencia.js', 'perfil.js', 'jugador.js', 'nombres.js', 'ranking.js', 'phaser/assets.js']) {
    const codigo = fs.readFileSync(path.join(raiz, 'public/assets/js', f), 'utf8').replace(/^const (\w+) =/gm, 'globalThis.$1 =');
    vm.runInContext(codigo, ctx);
}
const { Money, Pricing, Venta, Auditoria, Cobro, Compra, Reloj, Paciencia, Perfil, Jugador, Nombres, Ranking, PRODUCTOS_DEMO } = ctx;
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
// nombres aleatorios de clientes
{
    const vistos = new Set();
    let bien = true;
    for (let i = 0; i < 500; i++) {
        const n = Nombres.generar(rnd2);
        vistos.add(n.completo);
        bien = bien && /^[A-Za-z]+ [A-Za-z]+$/.test(n.completo) && n.completo.startsWith(n.nombre + ' ') && n.completo.length <= 100 && n.nombre.length <= 10;
    }
    ok(bien && vistos.size > 300, '500 nombres de cliente válidos (nombre + apellido, <= 100 caracteres) y variados: ' + vistos.size + ' distintos');
    ok(Nombres.generar(() => 0).completo === 'Camila Rodriguez', 'nombres: determinista con un generador fijo');
}
// PLU: cuatro frutas distintas, códigos únicos y todos son productos del catálogo
{
    const codigos = Object.keys(ctx.PLU), skusPlu = Object.values(ctx.PLU);
    ok(codigos.length === 12 && new Set(skusPlu).size === 12 && skusPlu.every((s) => PRODUCTOS_DEMO[s]), 'libro PLU: 12 productos distintos del catálogo (3 páginas de 4)');
    ok(ctx.PLU_POR_PAGINA === 4 && codigos.length % ctx.PLU_POR_PAGINA === 0, 'libro PLU: páginas completas');
    ok(codigos.every((c) => /^\d{4}$/.test(c)), 'libro PLU: códigos de 4 cifras');
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

// Recuperar la jornada tras recargar: exportar() y jornada(sueldo, copia)
{
    const a = Auditoria.jornada('200000.00');
    a.registrar({ faltantes: { 'LAC-002': 1 }, sobrantes: {}, perdida: 5000, sobrecobro: 0, exacta: false }, 12000);
    const b = Auditoria.jornada('200000.00', JSON.parse(JSON.stringify(a.exportar())));
    ok(JSON.stringify(b.resumen()) === JSON.stringify(a.resumen()), 'la jornada recuperada tiene el mismo resumen');
    b.registrar({ faltantes: { 'LAC-002': 1 }, sobrantes: {}, perdida: 5000, sobrecobro: 0, exacta: false }, 0);
    ok(b.resumen().faltantes['LAC-002'] === 2 && a.resumen().faltantes['LAC-002'] === 1, 'la copia no comparte estado con la original');
    const r = Reloj.crear({}); r.fijar(300000);
    ok(r.tiempo() === 300000 && r.texto() === '14:00', 'el reloj recupera su tiempo');
}

// Paciencia del cliente
{
    ok(Paciencia.duracion(0) === 35000 && Paciencia.duracion(5) === 75000, 'la paciencia crece con la compra');
    ok(Paciencia.duracion(50) === Paciencia.duracion(12), 'la paciencia tiene tope');
    ok(Paciencia.ritmoFila({ pacienciaFilaFactor: 0.5 }) === 0.5 && Paciencia.ritmoFila() === 0.25 && Paciencia.ritmoFila({ pacienciaFilaFactor: -1 }) === 0.25, 'la fila gasta la paciencia a otro ritmo (por defecto, un cuarto)');
    ok(ctx.JORNADA_CONFIG.pacienciaFilaFactor > 0 && ctx.JORNADA_CONFIG.pacienciaFilaFactor < 1, 'la configuración trae el ritmo de la fila');
    ok(Paciencia.duracion(5, { pacienciaBaseMs: 1000, pacienciaPorUnidadMs: 100 }) === 1500, 'la paciencia usa la configuración');
    const p = Paciencia.crear(10000);
    ok(p.restante() === 1 && p.nivel() === 'alta' && !p.agotada(), 'empieza llena');
    p.avanzar(6000);
    ok(p.nivel() === 'media' && Math.abs(p.restante() - 0.4) < 1e-9, 'a mitad es media');
    p.avanzar(2000);
    ok(p.nivel() === 'baja' && !p.agotada(), 'al final es baja');
    const rec = Paciencia.crear(10000, 7000);
    ok(rec.tiempo() === 7000 && rec.nivel() === 'media', 'la paciencia se recupera con lo ya gastado');
    ok(Paciencia.crear(10000, 99999).agotada(), 'lo gastado no pasa de la duración');
    p.avanzar(99999); p.avanzar(-5);
    ok(p.agotada() && p.restante() === 0, 'se agota y no baja de 0');
    const j = Auditoria.jornada('200000.00'); j.abandono(); j.abandono();
    const r = j.resumen();
    ok(r.abandonos === 2 && r.clientes === 2 && r.puntos === 2 * Auditoria.PUNTOS_ABANDONO && r.perdida === 0, 'el abandono resta puntos y no es pérdida');
}

// Identidad anónima del jugador
{
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    ok(uuid.test(Jugador.id()), 'sin localStorage ni crypto igual da un UUID válido (' + Jugador.id() + ')');
    ok(Jugador.id() === Jugador.id(), 'el id es estable durante la página');
}

// Progreso del jugador (localStorage simulado)
{
    const mem = {}; const almacen = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
    const resumen = (o) => Object.assign({ puntos: 100, sueldo: 18000000, clientes: 5, exactas: 2, abandonos: 0, cobrado: 5000000 }, o);
    let p = Perfil.crear(almacen);
    ok(p.datos().jornadas === 0, 'perfil nuevo vacío');
    let r = p.registrarJornada(resumen());
    ok(r.primera && r.recordPuntos && r.recordSueldo, 'la primera jornada marca récords');
    r = p.registrarJornada(resumen({ puntos: 50, sueldo: 19000000 }));
    ok(!r.primera && !r.recordPuntos && r.recordSueldo, 'récord solo de lo que se supera');
    ok(p.datos().jornadas === 2 && p.datos().puntos === 150 && p.datos().mejorPuntos === 100 && p.datos().clientes === 10 && p.datos().ventas === 10000000, 'acumula jornadas, puntos, clientes y ventas');
    p = Perfil.crear(almacen);                                                   // «recarga»: lee lo guardado
    ok(p.datos().jornadas === 2 && p.datos().mejorSueldo === 19000000, 'el progreso sobrevive a recargar');
    mem['d2-perfil'] = '{basura';
    ok(Perfil.crear(almacen).datos().jornadas === 0, 'datos dañados: se empieza de cero sin romper');
    mem['d2-perfil'] = JSON.stringify({ jornadas: 'x', puntos: 5 });
    ok(Perfil.crear(almacen).datos().jornadas === 0 && Perfil.crear(almacen).datos().puntos === 5, 'campos inválidos se ignoran');
    ok(Perfil.crear({ getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }).registrarJornada(resumen()).primera, 'sin almacenamiento sigue funcionando');
    p.reiniciar(); ok(p.datos().jornadas === 0, 'reiniciar borra el progreso');
}

// 6) Ranking y apodo (sin red: la API es un mock)
{
    const V = Ranking.validarApodo;
    ok(V('Ana').ok && V('  Ana María_2-b  ').apodo === 'Ana María_2-b', 'apodo válido (recortado, con tilde, _ y -)');
    ok(!V('Al').ok && !V('').ok && !V(null).ok && !V(undefined).ok && !V('   ').ok, 'apodo demasiado corto o vacío');
    ok(V('a'.repeat(20)).ok && !V('a'.repeat(21)).ok, 'límite de 20 caracteres');
    ok(!V('<b>hola</b>').ok && !V('ana!').ok && !V('a@b.co').ok && !V('ana\nbob').ok, 'caracteres no permitidos');
    ok(typeof V('xx').mensaje === 'string' && V('xx').mensaje.length > 0, 'el rechazo trae mensaje en español');

    const vacio = { getItem() { return null; }, setItem() {} };
    const fila = (posicion, apodo, puntos) => ({ posicion, apodo, puntos });

    // vista: vacía, cargando, error
    let vv = Ranking.vista({ fase: 'ok', top: [], yo: null });
    ok(vv.filas.length === 0 && /nadie/i.test(vv.aviso) && vv.pie === null, 'tabla vacía: aviso, sin filas');
    vv = Ranking.vista({ fase: 'error', top: [], yo: null });
    ok(vv.filas.length === 0 && /no disponible/i.test(vv.aviso), 'error: aviso discreto');
    vv = Ranking.vista({ fase: 'cargando', top: [], yo: null });
    ok(/cargando/i.test(vv.aviso), 'cargando: aviso');
    ok(Ranking.vista(undefined).aviso === null && Ranking.vista({ fase: 'inicial' }).filas.length === 0, 'estado inicial: nada');
    vv = Ranking.vista({ fase: 'ok', top: [fila(1, 'Ana', 1200), fila(2, 'Bob', 900)], yo: { apodo: 'Bob', puntos: 900, posicion: 2 } });
    ok(vv.filas.length === 2 && !vv.filas[0].yo && vv.filas[1].yo && vv.pie === null, 'la fila propia se resalta y no hay pie si está en el top');
    vv = Ranking.vista({ fase: 'ok', top: [fila(1, 'Ana', 1200)], yo: { apodo: 'Zoe', puntos: 40, posicion: 9 } });
    ok(!vv.filas.some((f) => f.yo) && /puesto 9/.test(vv.pie) && /40/.test(vv.pie), 'fuera del top: se muestra la posición propia');
    vv = Ranking.vista({ fase: 'ok', top: [fila(1, 'Ana', 1200)], yo: { apodo: null, puntos: 40, posicion: null } });
    ok(/apodo/i.test(vv.pie), 'sin apodo: invitación a elegirlo');
    vv = Ranking.vista({ fase: 'ok', top: [1, 2, 3, 4, 5, 6, 7].map((n) => fila(n, 'J' + n, 100 - n)), yo: null });
    ok(vv.filas.length === 5, 'nunca más de 5 filas');

    // pintarPared: DOM mínimo para comprobar la estructura y que los apodos van como texto, nunca como HTML
    const crearDoc = () => ({ createElement(tag) {
        const e = { tag, className: '', children: [], textContent: '', firstChild: null,
            appendChild(c) { this.children.push(c); this.firstChild = this.children[0]; return c; },
            removeChild(c) { this.children.splice(this.children.indexOf(c), 1); this.firstChild = this.children[0] || null; } };
        Object.defineProperty(e, 'innerHTML', { set() { throw new Error('innerHTML prohibido'); }, get() { return ''; } });
        return e;
    } });
    const doc = crearDoc(), caja = doc.createElement('div');
    const hostil = '<img src=x onerror=alert(1)>';
    const clases = (n) => n.className.split(' ');
    Ranking.pintarPared(doc, caja, Ranking.vista({ fase: 'ok', top: [fila(1, hostil, 10), fila(2, 'Bob', 5)], yo: null }));
    let raiz = caja.children[0];
    const f0 = raiz.children.find((n) => clases(n).includes('f0')), f1 = raiz.children.find((n) => clases(n).includes('f1'));
    ok(f0.children.length === 2 && f0.children[0].className === 'rk-apodo' && f0.children[0].textContent === hostil, 'el apodo se pinta como texto (sin innerHTML)');
    ok(!f0.children.some((c) => c.className === 'rk-pos') && f1.children[0].textContent === '2', 'el 1.º no lleva número (va la corona); el resto sí');
    ok(raiz.children.some((n) => n.className === 'rk-corona'), 'hay corona con un 1.º');
    Ranking.pintarPared(doc, caja, Ranking.vista({ fase: 'ok', top: [fila(1, 'Ana', 9), fila(2, 'Bob', 5)], yo: { apodo: 'Bob', puntos: 5, posicion: 2 } }));
    ok(caja.children[0].children.some((n) => clases(n).includes('rk-tu') && clases(n).includes('f1')), 'tu fila usa la imagen dorada, en su sitio');
    Ranking.pintarPared(doc, caja, Ranking.vista({ fase: 'ok', top: [1, 2, 3, 4, 5].map((n) => fila(n, 'J' + n, 100 - n)), yo: { apodo: 'Zoe', puntos: 7, posicion: 12 } }));
    const tuF = caja.children[0].children.find((n) => clases(n).includes('rk-tu'));
    ok(clases(tuF).includes('f4') && tuF.children[0].textContent === '12' && tuF.children[1].textContent === 'Zoe', 'fuera del top: tu puesto real ocupa la 5.ª fila');
    Ranking.pintarPared(doc, caja, Ranking.vista({ fase: 'ok', top: [], yo: null }));
    raiz = caja.children[0];
    ok(caja.children.length === 1 && clases(raiz).includes('rk-vacio') && /nadie/i.test(raiz.children[1].textContent) && !raiz.children.some((n) => n.className === 'rk-corona'), 'tabla vacía: panel vacío con su mensaje, sin corona');
    Ranking.pintarPared(doc, caja, Ranking.vista({ fase: 'error', top: [], yo: null }));
    ok(clases(caja.children[0]).includes('rk-vacio') && /no disponible/i.test(caja.children[0].children[1].textContent), 'error: panel vacío con el aviso');
    Ranking.pintarPared(doc, caja, Ranking.vista({ fase: 'cargando', top: [], yo: null }));
    ok(/cargando/i.test(caja.children[0].children[1].textContent), 'cargando: panel vacío con el aviso');

    ok(Ranking.paraPantalla('Ñandú <b>', 20) === 'NANDU ?B?' && Ranking.paraPantalla('abcdefghij', 5) === 'ABCD.', 'texto para el lienzo: sin tildes, mayúsculas, recortado');

    // Estado con API simulada
    const asinc = async () => {
        let r = Ranking.crear({ ranking: () => Promise.reject({ status: 0, mensaje: 'sin red' }), fijarApodo: () => Promise.reject({}) }, vacio);
        const vistas = [];
        r.alCambiar((e) => vistas.push(e.fase));
        await r.cargar();
        ok(r.estado().fase === 'error' && vistas.join() === 'cargando,error', 'sin red: pasa por cargando y acaba en error, sin lanzar');
        r = Ranking.crear({ ranking: () => { throw new Error('boom'); } }, vacio);
        await r.cargar();
        ok(r.estado().fase === 'error', 'si la API lanza, también es un error controlado');
        r = Ranking.crear({ ranking: () => Promise.resolve({ top: [], yo: null }) }, vacio);
        await r.cargar();
        ok(r.estado().fase === 'ok' && r.vistaActual().aviso !== null, 'respuesta con top vacío');
        r = Ranking.crear({ ranking: () => Promise.resolve({ basura: 1 }) }, vacio);
        await r.cargar();
        ok(r.estado().fase === 'error', 'respuesta sin forma de ranking: error');

        // respuestas desordenadas: gana la última petición
        const resolvers = [];
        r = Ranking.crear({ ranking: () => new Promise((res) => resolvers.push(res)) }, vacio);
        const a = r.cargar(), b = r.cargar();
        resolvers[1]({ top: [fila(1, 'Nueva', 5)], yo: null });
        resolvers[0]({ top: [fila(1, 'Vieja', 1)], yo: null });
        await Promise.all([a, b]);
        ok(r.estado().top[0].apodo === 'Nueva', 'una respuesta vieja no pisa a la nueva');

        // apodo: validación local antes de llamar, errores del servidor, guardado y «solo se pregunta una vez»
        const mem = {};
        const almacen = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
        let llamadas = 0, modo = 'ok';
        const api = {
            ranking: () => Promise.resolve({ top: [], yo: null }),
            fijarApodo: (a) => { llamadas++; return modo === 'ok' ? Promise.resolve({ apodo: a }) : Promise.reject({ status: modo, mensaje: 'Ese apodo ya está en uso' }); }
        };
        r = Ranking.crear(api, almacen);
        ok(r.debePreguntar() && r.apodo() === null, 'jugador nuevo: hay que preguntar el apodo');
        let e1 = await r.fijarApodo('x').then(() => null, (e) => e);
        ok(e1 && e1.mensaje && llamadas === 0, 'apodo inválido: se rechaza sin llamar al servidor');
        modo = 409;
        e1 = await r.fijarApodo('Ana').then(() => null, (e) => e);
        ok(e1 && e1.status === 409 && /uso/.test(e1.mensaje) && r.apodo() === null && r.debePreguntar(), 'el 409 del servidor llega con su mensaje y no guarda nada');
        modo = 'ok';
        ok(await r.fijarApodo('  Ana  ') === 'Ana' && r.apodo() === 'Ana' && !r.debePreguntar(), 'apodo guardado (recortado) y ya no se vuelve a preguntar');
        r = Ranking.crear(api, almacen);
        ok(r.apodo() === 'Ana' && !r.debePreguntar(), 'el apodo sobrevive a recargar la página');
        mem['d2-apodo'] = '{basura';
        r = Ranking.crear(api, almacen);
        ok(r.apodo() === null && r.debePreguntar(), 'datos dañados: como jugador nuevo');
        r.marcarPreguntado();
        ok(!r.debePreguntar() && r.apodo() === null, 'omitir: no se vuelve a preguntar, pero se puede elegir luego');
        r = Ranking.crear(api, { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } });
        ok(await r.fijarApodo('Luis') === 'Luis', 'sin almacenamiento sigue funcionando');
    };
    await asinc();

    // código de recuperación
    ok(Jugador.valido('123e4567-e89b-42d3-a456-426614174000') && Jugador.valido(' 123E4567-E89B-42D3-A456-426614174000 ') && !Jugador.valido('hola') && !Jugador.valido(''), 'código de recuperación: solo un UUID');
    ok(!Jugador.fijar('nope') && Jugador.fijar('123e4567-e89b-42d3-a456-426614174000') && Jugador.id() === '123e4567-e89b-42d3-a456-426614174000', 'fijar adopta el código');
}

// 7) La CSP del sitio (public/.htaccess): script-src 'self' y style-src 'self' no admiten nada en línea.
//    Esto ya falló una vez: un <script> en línea en index.html dejó el juego sin cargar en producción, y no se vio
//    porque `php -S` no aplica las cabeceras de Apache. Aquí se comprueba el HTML contra la política real.
{
    const htaccess = fs.readFileSync(path.join(raiz, 'public/.htaccess'), 'utf8');
    const csp = (/Content-Security-Policy\s+"([^"]+)"/.exec(htaccess) || [])[1] || '';
    ok(/script-src 'self'(;|$)/.test(csp) && !/'unsafe-inline'/.test(csp), 'CSP: script-src es solo \'self\' (si cambia, revisa esta sección)');
    const html = fs.readFileSync(path.join(raiz, 'public/index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html: ningún <script> en línea (la CSP lo bloquea)');
    ok(!/\son[a-z]+\s*=\s*["']/i.test(html), 'index.html: ningún manejador on...= en atributos (la CSP los bloquea)');
    ok(!/\sstyle\s*=\s*["']/i.test(html) && !/<style[\s>]/i.test(html), 'index.html: ni style="" ni <style> (style-src \'self\')');
    const externos = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((u) => /^(https?:)?\/\//i.test(u));
    ok(externos.length === 0, 'index.html: scripts y hojas de estilo solo del propio sitio' + (externos.length ? ' (hay: ' + externos.join(', ') + ')' : ''));

    // El cargador: lo carga index.html con ?v=, y cada script que lista debe existir (si no, el juego no arranca)
    ok(/<script src="assets\/js\/cargador\.js\?v=[^"]*"><\/script>/.test(html), 'index.html carga assets/js/cargador.js?v=VERSION (deploy/Containerfile sustituye ese valor)');
    const cargador = fs.readFileSync(path.join(raiz, 'public/assets/js/cargador.js'), 'utf8');
    const lista = [...(/var scripts = \[([\s\S]*?)\];/.exec(cargador) || [, ''])[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    ok(lista.length > 10 && lista[lista.length - 1] === 'app.js', 'cargador.js: lista de scripts completa, con app.js al final');
    ok(lista.every((f) => fs.existsSync(path.join(raiz, 'public/assets/js', f))), 'cargador.js: cada script de la lista existe' + lista.filter((f) => !fs.existsSync(path.join(raiz, 'public/assets/js', f))).map((f) => ' (falta ' + f + ')').join(''));
    ok(!/eval\(|new Function\(/.test(cargador), 'cargador.js: sin eval');
    // ...y la versión se lee del ?v= del propio archivo
    const doc = []; const falso = { currentScript: { src: 'https://x.test/assets/js/cargador.js?v=abc1234' }, write: (t) => doc.push(t) };
    vm.runInContext(cargador, vm.createContext({ document: falso }));
    ok(doc.length === lista.length && doc.every((t) => t.includes('?v=abc1234')), 'cargador.js: pide cada script con la versión de su propia URL');
    ok(doc[0].startsWith('<script src="assets/js/money.js') && doc[doc.length - 1].includes('app.js'), 'cargador.js: respeta el orden');
}

console.log(fallos ? '\n' + fallos + ' FALLOS de ' + pruebas : '\nTodo correcto (' + pruebas + ' comprobaciones)');
process.exit(fallos ? 1 : 0);
