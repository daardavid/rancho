import type { Node } from '@xyflow/react'
import type { ArchDetail, ArchNodeData } from '../../types/architecture.ts'
import { archNode } from './nodeFactory.ts'

const section = (heading: string, items?: string[], text?: string) => ({ heading, items, text })

export interface ReadModelRecord {
  id: string
  title: string
}

export const readModels: ReadModelRecord[] = [
  { id: 'rm-weekly', title: 'Resumen semanal' },
  { id: 'rm-growth', title: 'Crecimiento del animal' },
  { id: 'rm-profit', title: 'Rentabilidad provisional' },
  { id: 'rm-variance', title: 'Variación de inventario' },
  { id: 'rm-risk', title: 'Riesgo de ausencia' },
  { id: 'rm-last', title: 'Última observación' },
]

export const readModelNodes: Node<ArchNodeData, 'archNode'>[] = [
  archNode('rm-weekly', 220, 276, 'readmodel', 'Solo lectura', 'Resumen semanal', 'Muestra huecos. No los rellena.'),
  archNode('rm-growth', 376, 276, 'readmodel', 'Solo lectura', 'Crecimiento', 'Lee los pesos. No los corrige.'),
  archNode('rm-profit', 532, 276, 'readmodel', 'Solo lectura', 'Rentabilidad provisional', 'No es el libro de finanzas.'),
  archNode('rm-variance', 688, 276, 'readmodel', 'Solo lectura', 'Variación de inventario', 'No reescribe movimientos.'),
  archNode('rm-risk', 844, 276, 'readmodel', 'Solo lectura', 'Riesgo de ausencia', 'No es la ausencia ni la salida.'),
  archNode('rm-last', 1000, 276, 'readmodel', 'Proyección', 'Última observación', 'No es una columna del animal.'),
]

export const readModelDetails: ArchDetail[] = [
  {
    id: 'rm-weekly',
    kicker: 'Solo lectura',
    title: 'Resumen semanal',
    summary: 'La lectura de la semana. Consulta los módulos que ya guardaron el hecho. No escribe ninguno.',
    sections: [
      section('De dónde lee', [
        'Kilos comprados: recibos de inventario.',
        'Preparado y entregado: alimentación.',
        'Identidad, lugar y salidas: hato.',
        'Ingresos y gastos conocidos: finanzas.',
      ]),
      section('Límite', ['Muestra lo que falta. No inventa la cifra que falta.']),
    ],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-GOV-001', 'CAP-GOV-001'],
  },
  {
    id: 'rm-growth',
    kicker: 'Solo lectura',
    title: 'Crecimiento del animal',
    summary: 'Presenta la serie de pesos que Crecimiento ya guardó.',
    sections: [section('Límite', ['Corregir un peso es un comando de Crecimiento, no un edit de esta vista.'])],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-WEIGH-001', 'CAP-GROW-001'],
  },
  {
    id: 'rm-profit',
    kicker: 'Solo lectura',
    title: 'Rentabilidad provisional',
    summary: 'Suma lo que Finanzas atribuyó de forma explícita y muestra el pool que nadie atribuyó. No es el libro.',
    sections: [
      section('No hace', [
        'No inventa una atribución.',
        'No escribe un margen en la venta ni en el animal.',
        'No calcula la parte del socio.',
        'No muestra costo por kilo ganado mientras el alimento no esté observado o medido.',
      ]),
    ],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-PROFIT-001', 'CAP-FIN-001', 'CAP-OWN-001'],
  },
  {
    id: 'rm-variance',
    kicker: 'Solo lectura',
    title: 'Variación de inventario',
    summary: 'Compara el conteo con el saldo derivado de los movimientos.',
    sections: [section('Límite', ['No borra movimientos ni asigna culpa.'])],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-INV-001', 'CAP-INV-001'],
  },
  {
    id: 'rm-risk',
    kicker: 'Solo lectura',
    title: 'Riesgo de ausencia',
    summary: 'Señala un animal que parece no verse. No afirma que falte y no lo saca del rancho.',
    sections: [
      section('Tres cosas distintas', [
        'Esta vista es una sospecha calculada.',
        'ConfirmedMissingAssertion es la afirmación del hato. La vista no la inserta.',
        'La salida es otra operación del hato. La vista no la dispara.',
      ]),
    ],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-HERD-VERIFY-001', 'TGT-SEC-001', 'CAP-SEC-001'],
  },
  {
    id: 'rm-last',
    kicker: 'Proyección · solo lectura',
    title: 'Última observación',
    summary: 'Normaliza avistamientos que ya están en otros registros. El pesaje no espera a que esta proyección exista.',
    sections: [
      section('Puede salir de', [
        'Un peso cuyo animal quedó identificado.',
        'Una verificación del hato que confirmó presencia.',
        'Una nota de salud que dice que el animal fue visto.',
      ]),
      section('No sale de', [
        'Una asignación de potrero.',
        'Un hueco entre pesajes.',
        'Un resultado «no confirmado».',
        'Una edición administrativa.',
      ]),
      section('No existe', ['No hay un evento de dominio AnimalObserved que los módulos deban publicar.']),
    ],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-SEC-001', 'CAP-SEC-001'],
  },
]
