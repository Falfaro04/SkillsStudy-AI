// Curso de ejemplo. Las fechas se calculan desde hoy para que siempre esté a mitad de cuatrimestre.
import { addDays, startOfWeek, today, toISO } from './model.js';

const MATERIAL = `## Unidad 1. La ecuación contable

La contabilidad registra lo que tiene un negocio, lo que debe y lo que les pertenece a sus dueños. Esas tres partes se relacionan en la ecuación contable: Activo = Pasivo + Patrimonio.

El activo son los recursos que controla el negocio y que le van a generar beneficios: el efectivo en caja, el dinero en el banco, las cuentas por cobrar a clientes, el inventario, el mobiliario y el equipo. El pasivo son las obligaciones con terceros: préstamos bancarios, cuentas por pagar a proveedores, salarios e impuestos por pagar. El patrimonio es la parte de los recursos que pertenece a los dueños: lo que aportaron más las utilidades que el negocio ha acumulado.

Pensemos en la Soda La Esquina. Su dueña, Marta, abre el negocio aportando ₡2.000.000 en efectivo. En ese momento el activo (Caja) es de ₡2.000.000 y el patrimonio (Capital) también. Luego pide un préstamo de ₡1.000.000 al banco: la caja sube a ₡3.000.000 y aparece un pasivo de ₡1.000.000. Después compra una refrigeradora de ₡600.000 a crédito: el activo sube a ₡3.600.000 y el pasivo a ₡1.600.000. En todos los casos la ecuación se mantiene en equilibrio: ₡3.600.000 = ₡1.600.000 + ₡2.000.000.

La ecuación no es solo una fórmula para memorizar. Cada transacción cambia al menos dos partidas, y si después de registrarla los dos lados no son iguales, hay un error.

## Unidad 2. Partida doble y asientos de diario

La partida doble dice que toda transacción afecta al menos dos cuentas, y que lo que se anota al debe (lado izquierdo) siempre es igual a lo que se anota al haber (lado derecho). Anotar al debe se llama debitar o cargar; anotar al haber se llama acreditar o abonar.

Cada tipo de cuenta tiene una naturaleza. Las cuentas de activo y de gastos son deudoras: aumentan con débitos y disminuyen con créditos. Las cuentas de pasivo, patrimonio e ingresos son acreedoras: aumentan con créditos y disminuyen con débitos. Una forma de recordarlo: los gastos reducen el patrimonio, por eso se comportan al revés que él.

Las transacciones se registran en orden cronológico en el libro diario, mediante asientos. Un asiento indica la fecha, las cuentas que se debitan, las que se acreditan, los montos y una breve explicación. Por ejemplo, si la soda paga ₡150.000 de alquiler en efectivo, se debita Gasto por alquiler por ₡150.000 y se acredita Caja por ₡150.000.

Cuando la soda vende a crédito, registra el ingreso en el momento de la venta: debita Cuentas por cobrar y acredita Ingresos por ventas. Cuando el cliente paga, ya no hay un nuevo ingreso; solo se debita Caja y se acredita Cuentas por cobrar.

Después, los movimientos del diario se trasladan al libro mayor, donde cada cuenta acumula sus débitos y créditos y muestra su saldo.

## Unidad 3. Ajustes y depreciación

Al final de cada periodo, antes de preparar los estados financieros, se hacen asientos de ajuste. Su objetivo es cumplir el principio de devengo: los ingresos se reconocen cuando se ganan y los gastos cuando se incurren, sin importar cuándo se cobra o se paga.

Hay cuatro casos comunes. Los gastos pagados por adelantado, como un seguro anual, se registran primero como activo y cada mes se pasa a gasto la parte consumida. Los gastos acumulados, como salarios que se trabajaron este mes pero se pagan el siguiente, se registran como gasto y como pasivo. Los ingresos cobrados por adelantado son un pasivo hasta que se presta el servicio. Y la depreciación reparte el costo de un activo fijo a lo largo de su vida útil.

El método más usado es el de línea recta: se resta el valor residual al costo y el resultado se divide entre los años de vida útil. La refrigeradora de la soda costó ₡600.000, se espera que dure 5 años y no tendrá valor residual. Su depreciación anual es de ₡120.000, es decir, ₡10.000 por mes.

El asiento de depreciación debita Gasto por depreciación y acredita Depreciación acumulada. La depreciación acumulada no se resta directamente de la cuenta Equipo: se presenta en el balance como una cuenta que disminuye su valor. Así se sigue viendo cuánto costó el activo y cuánto se ha consumido.

## Unidad 4. El IVA en las operaciones

En Costa Rica, el impuesto al valor agregado (IVA) tiene una tarifa general del 13 %. Cuando la soda vende un casado de ₡3.000, le cobra al cliente ₡3.390: ₡3.000 del precio y ₡390 de IVA.

Ese impuesto no es un ingreso de la soda. El negocio solo lo recauda por cuenta de Hacienda, así que lo registra como un pasivo: IVA por pagar. Una venta a crédito de ₡50.000 más IVA se registra debitando Cuentas por cobrar por ₡56.500 y acreditando Ingresos por ventas por ₡50.000 e IVA por pagar por ₡6.500.

Cuando la soda compra insumos para el negocio, también paga IVA. Ese IVA soportado, o crédito fiscal, se puede restar del IVA cobrado en ventas. Si en un mes la soda cobró ₡520.000 de IVA y pagó ₡310.000 en compras del negocio, le corresponde pagar a Hacienda la diferencia: ₡210.000.

Un error común es calcular el precio sin IVA restando el 13 % al precio total. Si un precio de ₡11.300 ya incluye el impuesto, el precio sin IVA se obtiene dividiendo entre 1,13: ₡10.000.

## Unidad 5. Estados financieros

Los estados financieros resumen la información del periodo para que los dueños, el banco o Hacienda puedan tomar decisiones.

El estado de resultados muestra los ingresos y los gastos de un periodo, por ejemplo un mes o un año, y la diferencia entre ellos: la utilidad neta o la pérdida. Si en octubre la soda tuvo ingresos por ₡2.400.000 y gastos por ₡1.900.000, su utilidad neta fue de ₡500.000. El gasto por depreciación aparece aquí, entre los gastos.

El balance general, también llamado estado de situación financiera, muestra los activos, los pasivos y el patrimonio a una fecha determinada. Es una fotografía de la ecuación contable en ese momento. La depreciación acumulada aparece aquí, restando al valor del equipo.

Los dos estados están conectados. Al cerrar el periodo, la utilidad neta aumenta el patrimonio, en la cuenta de utilidades retenidas. Por eso, una soda con utilidad no necesariamente tiene más efectivo: la utilidad pudo haberse convertido en inventario, en equipo o en cuentas por cobrar.`;

const q = (id, pregunta, opciones, explicacion) => ({ id, pregunta, opciones, correcta: 0, explicacion });

const BANCO = {
  t1: [
    q('t1q1', '¿Cuál es la ecuación contable básica?',
      ['Activo = Pasivo + Patrimonio', 'Activo + Pasivo = Patrimonio', 'Patrimonio = Activo + Pasivo', 'Ingresos − Gastos = Activo'],
      'Los recursos del negocio (activo) se financian con deudas (pasivo) o con lo que aportan los dueños más las utilidades (patrimonio).'),
    q('t1q2', 'La Soda La Esquina tiene activos por ₡5.000.000 y pasivos por ₡1.800.000. ¿Cuál es su patrimonio?',
      ['₡3.200.000', '₡6.800.000', '₡1.800.000', '₡5.000.000'],
      'Patrimonio = Activo − Pasivo = ₡5.000.000 − ₡1.800.000 = ₡3.200.000.'),
    q('t1q3', 'La dueña aporta ₡2.000.000 en efectivo al negocio. ¿Qué pasa con la ecuación?',
      ['Aumentan el activo (Caja) y el patrimonio (Capital)', 'Aumentan el activo y el pasivo', 'Aumenta el activo y disminuye el pasivo', 'No cambia, porque es dinero de la dueña'],
      'El aporte entra a Caja (activo) y aumenta el Capital (patrimonio) por el mismo monto.'),
    q('t1q4', '¿Cuál de estas cuentas es un pasivo?',
      ['Cuentas por pagar a proveedores', 'Mobiliario y equipo', 'Cuentas por cobrar a clientes', 'Capital social'],
      'Es una obligación con terceros: el negocio les debe dinero a sus proveedores.'),
    q('t1q5', 'La soda compra una refrigeradora de ₡600.000 a crédito. ¿Cómo queda la ecuación?',
      ['Activo +₡600.000 y pasivo +₡600.000', 'Activo +₡600.000 y patrimonio +₡600.000', 'Activo +₡600.000 y activo −₡600.000', 'Pasivo +₡600.000 y patrimonio −₡600.000'],
      'Entra un activo (Equipo) y nace una deuda (Cuentas por pagar). La ecuación sigue en equilibrio.'),
  ],
  t2: [
    q('t2q1', 'Según la partida doble, en todo asiento…',
      ['la suma del debe es igual a la suma del haber', 'el debe siempre es mayor que el haber', 'solo se afecta una cuenta', 'el haber registra solo salidas de efectivo'],
      'Toda transacción afecta al menos dos cuentas y los débitos siempre igualan a los créditos.'),
    q('t2q2', '¿Cómo aumenta una cuenta de activo?',
      ['Con un débito (al debe)', 'Con un crédito (al haber)', 'Con débito o crédito, según el monto', 'No aumenta, solo disminuye'],
      'Las cuentas de activo son deudoras: aumentan al debe y disminuyen al haber.'),
    q('t2q3', 'Se pagan ₡150.000 de alquiler en efectivo. ¿Cuál es el asiento?',
      ['Debe: Gasto por alquiler / Haber: Caja', 'Debe: Caja / Haber: Gasto por alquiler', 'Debe: Alquiler por pagar / Haber: Caja', 'Debe: Gasto por alquiler / Haber: Capital'],
      'El gasto aumenta (debe) y el efectivo disminuye (haber), los dos por ₡150.000.'),
    q('t2q4', '¿Qué naturaleza tiene la cuenta Ingresos por ventas?',
      ['Acreedora: aumenta con créditos', 'Deudora: aumenta con débitos', 'Es un activo', 'No tiene saldo'],
      'Los ingresos aumentan el patrimonio, por eso aumentan al haber.'),
    q('t2q5', 'Un cliente paga ₡80.000 que debía de una venta anterior. ¿Qué cuentas se afectan?',
      ['Caja aumenta (debe) y Cuentas por cobrar disminuye (haber)', 'Caja aumenta e Ingresos por ventas aumenta', 'Cuentas por cobrar aumenta y Caja disminuye', 'Caja aumenta y Capital aumenta'],
      'El ingreso se registró cuando se vendió a crédito. Ahora solo se cobra la cuenta pendiente.'),
  ],
  t3: [
    q('t3q1', 'La refrigeradora costó ₡600.000, dura 5 años y no tendrá valor residual. Con línea recta, ¿cuánto se deprecia por mes?',
      ['₡10.000', '₡120.000', '₡50.000', '₡12.000'],
      '₡600.000 ÷ 5 años = ₡120.000 al año, y ₡120.000 ÷ 12 = ₡10.000 por mes.'),
    q('t3q2', '¿Por qué se hacen asientos de ajuste al final del periodo?',
      ['Para registrar ingresos y gastos en el periodo en que ocurren (devengo)', 'Para que la caja cuadre con el banco', 'Para corregir errores de suma', 'Para cerrar las cuentas de activo'],
      'El principio de devengo pide reconocer ingresos y gastos cuando ocurren, no cuando se cobra o se paga.'),
    q('t3q3', '¿Cuál es el asiento de depreciación mensual?',
      ['Debe: Gasto por depreciación / Haber: Depreciación acumulada', 'Debe: Equipo / Haber: Caja', 'Debe: Depreciación acumulada / Haber: Gasto por depreciación', 'Debe: Gasto por depreciación / Haber: Caja'],
      'El gasto aumenta al debe y la depreciación acumulada, que resta al activo, aumenta al haber. No sale efectivo.'),
    q('t3q4', 'Se pagaron ₡360.000 de seguro por 12 meses por adelantado. Al cierre del primer mes, ¿qué ajuste se hace?',
      ['Gasto por seguro ₡30.000 contra Seguro pagado por adelantado', 'Gasto por seguro ₡360.000 contra Caja', 'Seguro pagado por adelantado ₡30.000 contra Gasto por seguro', 'Ninguno hasta que termine el año'],
      'Cada mes se consume 1/12 del seguro: ₡30.000 pasan de activo a gasto.'),
    q('t3q5', 'Los salarios de la última semana del mes se pagan hasta el mes siguiente. ¿Qué se registra al cierre?',
      ['Gasto por salarios contra Salarios por pagar', 'Nada, porque todavía no se pagan', 'Salarios por pagar contra Caja', 'Caja contra Gasto por salarios'],
      'El gasto ya ocurrió este mes, así que se reconoce junto con la deuda (un pasivo).'),
  ],
  t4: [
    q('t4q1', 'La soda vende un casado en ₡3.000 más IVA del 13 %. ¿Cuánto cobra en total?',
      ['₡3.390', '₡3.130', '₡3.013', '₡2.610'],
      '₡3.000 × 13 % = ₡390, y ₡3.000 + ₡390 = ₡3.390.'),
    q('t4q2', 'El IVA que la soda les cobra a sus clientes es…',
      ['un pasivo (IVA por pagar)', 'un ingreso de la soda', 'un gasto de la soda', 'parte del capital'],
      'La soda solo lo recauda: se lo debe a Hacienda.'),
    q('t4q3', 'En el mes la soda cobró ₡520.000 de IVA en ventas y pagó ₡310.000 de IVA en compras del negocio. ¿Cuánto le paga a Hacienda?',
      ['₡210.000', '₡520.000', '₡830.000', '₡310.000'],
      'Al IVA cobrado se le resta el IVA soportado en compras (crédito fiscal): ₡520.000 − ₡310.000.'),
    q('t4q4', 'Un precio de ₡11.300 ya incluye el IVA del 13 %. ¿Cuál es el precio sin IVA?',
      ['₡10.000', '₡9.831', '₡10.100', '₡11.170'],
      'Se divide entre 1,13: ₡11.300 ÷ 1,13 = ₡10.000. Restar el 13 % al total (₡9.831) es el error común.'),
    q('t4q5', 'La soda vende a crédito ₡50.000 más IVA. ¿Cuál es el asiento correcto?',
      ['Debe: Cuentas por cobrar ₡56.500 / Haber: Ventas ₡50.000 e IVA por pagar ₡6.500', 'Debe: Cuentas por cobrar ₡50.000 / Haber: Ventas ₡50.000', 'Debe: Cuentas por cobrar ₡56.500 / Haber: Ventas ₡56.500', 'Debe: Caja ₡56.500 / Haber: Ventas ₡50.000 e IVA por pagar ₡6.500'],
      'El cliente debe el total con IVA. La venta se registra sin el impuesto y el IVA queda como pasivo. Como es a crédito, no entra a Caja.'),
  ],
  t5: [
    q('t5q1', '¿Qué muestra el estado de resultados?',
      ['Los ingresos y gastos de un periodo, y la utilidad o pérdida', 'Los activos, pasivos y patrimonio a una fecha', 'Solo las entradas y salidas de efectivo', 'Todas las cuentas con sus saldos'],
      'Resume el desempeño de un periodo: ingresos menos gastos.'),
    q('t5q2', '¿Qué muestra el balance general (estado de situación financiera)?',
      ['Activos, pasivos y patrimonio a una fecha determinada', 'Ingresos y gastos de un periodo', 'Los cambios del efectivo durante el mes', 'Solo las deudas de la empresa'],
      'Es una fotografía de la ecuación contable en un momento.'),
    q('t5q3', 'Ingresos del mes: ₡2.400.000. Gastos: ₡1.900.000. ¿Cuál es la utilidad neta?',
      ['₡500.000', '₡4.300.000', '₡1.900.000', '₡2.400.000'],
      'Utilidad neta = ingresos − gastos = ₡2.400.000 − ₡1.900.000.'),
    q('t5q4', 'Al cerrar el periodo, ¿a dónde va la utilidad neta en el balance?',
      ['Aumenta el patrimonio (utilidades retenidas)', 'Aumenta el pasivo', 'Se suma a Caja automáticamente', 'Disminuye el activo'],
      'La utilidad pertenece a los dueños, así que aumenta el patrimonio. No es lo mismo que efectivo.'),
    q('t5q5', '¿Dónde aparece la Depreciación acumulada?',
      ['En el balance general, restando al activo fijo', 'En el estado de resultados, como ingreso', 'En el balance general, como pasivo', 'En ningún estado financiero'],
      'Es una cuenta complementaria de activo. El gasto por depreciación, en cambio, va en el estado de resultados.'),
  ],
};

export function buildDemo() {
  const w1 = addDays(startOfWeek(today()), -42); // hoy cae en la semana 7
  const at = (week, day) => toISO(addDays(w1, (week - 1) * 7 + day));
  const t = (id, nombre, semana, resumen) => ({ id, nombre, semana, resumen });
  const done = {};
  ['t-t1-leer', 'e-ev1-avance-2', 'e-ev1-avance-1', 'e-ev1-entrega', 'e-ev2-repaso'].forEach((id) => { done[id] = true; });
  const stats = {};
  ['t1q1', 't1q2', 't1q3', 't1q4', 't1q5', 't2q1', 't2q2', 't2q4', 't2q5'].forEach((id) => { stats[id] = { visto: 1, ultimaMal: false }; });
  stats.t2q3 = { visto: 1, ultimaMal: true };
  ['t3q1', 't3q2', 't3q4'].forEach((id) => { stats[id] = { visto: 1, ultimaMal: true }; });
  ['t3q3', 't3q5'].forEach((id) => { stats[id] = { visto: 1, ultimaMal: false }; });

  return {
    id: 'demo',
    demo: true,
    nombre: 'Contabilidad I',
    institucion: 'Curso de ejemplo',
    periodo: 'Cuatrimestre de ejemplo',
    escala: 100,
    notaAprobacion: 70,
    inicio: toISO(w1),
    fin: at(14, 5),
    temas: [
      t('t1', 'La ecuación contable', 1, 'Activo, pasivo y patrimonio, y cómo cada transacción mantiene el equilibrio.'),
      t('t2', 'Partida doble y asientos de diario', 3, 'Debe y haber, naturaleza de las cuentas, libro diario y mayor.'),
      t('t3', 'Ajustes y depreciación', 7, 'Principio de devengo, ajustes de cierre y depreciación en línea recta.'),
      t('t4', 'El IVA en las operaciones', 9, 'IVA del 13 %, IVA por pagar y crédito fiscal.'),
      t('t5', 'Estados financieros', 11, 'Estado de resultados, balance general y cómo se conectan.'),
    ],
    evaluaciones: [
      { id: 'ev1', nombre: 'Tarea 1', tipo: 'tarea', peso: 10, fecha: at(3, 4), temas: ['t1'], nota: 85 },
      { id: 'ev2', nombre: 'Parcial 1', tipo: 'parcial', peso: 25, fecha: at(6, 5), temas: ['t1', 't2'], nota: 62 },
      { id: 'ev3', nombre: 'Tarea 2', tipo: 'tarea', peso: 10, fecha: at(12, 2), temas: ['t4'], nota: null },
      { id: 'ev4', nombre: 'Proyecto: contabilidad de una soda', tipo: 'proyecto', peso: 20, fecha: at(12, 4), temas: ['t3', 't4', 't5'], nota: null },
      { id: 'ev5', nombre: 'Parcial 2', tipo: 'parcial', peso: 35, fecha: at(14, 5), temas: ['t3', 't4', 't5'], nota: null },
    ],
    material: [{ id: 'demo-mat', titulo: 'Apuntes: unidades 1 a 5', chars: MATERIAL.length }],
    dominio: {
      t1: { r: [1, 1, 0, 1, 1, 1, 1, 1] },
      t2: { r: [1, 0, 1, 0, 1, 1, 0, 1, 1, 0] },
      t3: { r: [0, 1, 0, 0, 1] },
    },
    quests: {
      t1: { completada: true, mejor: 5, intentos: 1 },
      t2: { completada: true, mejor: 4, intentos: 2 },
      t3: { completada: false, mejor: 2, intentos: 1 },
    },
    banco: Object.fromEntries(Object.entries(BANCO).map(([temaId, qs]) => [temaId, qs.map((x) => ({ ...x, temaId }))])),
    preguntaStats: stats,
    plan: { hechos: done },
    feynman: [
      {
        id: 'fy-demo',
        temaId: 't2',
        fecha: toISO(addDays(today(), -9)),
        texto: 'La partida doble es que cada vez que pasa algo en el negocio se anota en dos lados, el debe y el haber, y tienen que dar lo mismo. Los activos suben en el debe y los pasivos en el haber. Los ingresos también suben en el debe porque entra plata.',
        resultado: {
          puntaje: 62,
          bien: ['Entendés que cada transacción afecta al menos dos cuentas y que el debe y el haber deben ser iguales.', 'Sabés que el activo aumenta al debe y el pasivo al haber.'],
          falta: ['No mencionás el patrimonio ni los gastos, que también tienen naturaleza deudora o acreedora.', 'Faltó explicar qué es un asiento y para qué sirve el libro diario.'],
          errores: ['Los ingresos aumentan al haber, no al debe: aumentan el patrimonio. El efectivo que entra se registra aparte, en Caja.'],
          pregunta: 'Si la soda vende a crédito, ¿por qué se registra el ingreso aunque todavía no entre plata?',
        },
      },
    ],
    simulacros: [],
    creado: Date.now(),
  };
}

export const DEMO_TEXTOS = { 'demo-mat': MATERIAL };
export const demoPerfil = () => ({ xp: 340, racha: { ultimo: toISO(addDays(today(), -1)), dias: 4 } });
