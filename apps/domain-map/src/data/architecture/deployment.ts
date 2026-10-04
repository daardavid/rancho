import type { Edge, Node } from '@xyflow/react'
import type { ArchDetail, ArchNodeData } from '../../types/architecture.ts'
import { archEdge, archNode } from './nodeFactory.ts'

const section = (heading: string, items?: string[], text?: string) => ({ heading, items, text })

export const deploymentNodes: Node<ArchNodeData, 'archNode'>[] = [
  archNode(
    'dep-browser',
    210,
    0,
    'runtime',
    'Un origen',
    'Navegador',
    'La SPA es React, TypeScript y Vite.',
  ),
  archNode(
    'dep-node',
    160,
    160,
    'runtime',
    'Un solo desplegable',
    'Proceso Node de RANCHO',
    'La API y la SPA compilada salen del mismo proceso.',
    {
      pointsLabel: 'Dentro del proceso',
      points: [
        'Fastify, borde HTTP',
        'Capa de aplicación',
        'Monolito modular',
        'Modelos de lectura',
        'Archivos estáticos de la SPA',
      ],
    },
  ),
  archNode(
    'dep-postgres',
    0,
    470,
    'store',
    'Una base',
    'PostgreSQL',
    'Una sola base. Sin esquema read_model.',
    {
      pointsLabel: 'Negocio',
      points: ['herd', 'growth', 'feeding', 'inventory', 'finance'],
      asideLabel: 'Técnicos',
      aside: ['identity', 'evidence'],
    },
  ),
  archNode(
    'dep-storage',
    400,
    470,
    'store',
    'Sin proveedor',
    'Almacenamiento de objetos',
    'En desarrollo, el disco local. Al desplegar, un almacén compatible con S3.',
  ),
]

export const deploymentEdges: Edge<{ kind: 'call' | 'read' | 'technical' }>[] = [
  archEdge('dep-e1', 'dep-browser', 'dep-node', 'call', 'down', 'mismo origen'),
  archEdge('dep-e2', 'dep-node', 'dep-postgres', 'technical', 'down', 'datos', 'bottom-data'),
  archEdge('dep-e3', 'dep-node', 'dep-storage', 'technical', 'down', 'archivos', 'bottom-files'),
]

export const deploymentDetails: ArchDetail[] = [
  {
    id: 'dep-browser',
    kicker: 'Cliente',
    title: 'Navegador',
    summary: 'La aplicación del propietario es una SPA. El mapa de descubrimiento no es esa aplicación.',
    sections: [
      section('Desarrollo', ['Vite sirve la interfaz y reenvía /api al proceso Node.']),
      section('Producción', ['El mismo origen sirve la SPA compilada y la API. No hay CORS abierto a cualquier sitio.']),
    ],
    adrIds: ['ADR-006', 'ADR-009'],
  },
  {
    id: 'dep-node',
    kicker: 'Un proceso',
    title: 'Proceso Node de RANCHO',
    summary: 'Todo el monolito corre en un proceso de larga duración. No es un servicio por módulo.',
    sections: [
      section('Qué contiene', [
        'Fastify solo en el borde HTTP. El dominio no importa Fastify.',
        'La capa de aplicación abre una transacción y llama a los módulos.',
        'Los cinco módulos viven como carpetas de ese proceso.',
        'Las lecturas consultan. No tienen base propia.',
        'La SPA compilada se sirve desde aquí en producción.',
      ]),
      section('Comandos', [
        'El borde valida con Zod y traduce el cuerpo a un comando.',
        'Una salida es un comando, por ejemplo post de salida de un animal.',
        'No es un parche genérico que ponga active en falso.',
        'El catálogo completo de rutas no está diseñado.',
      ]),
      section('Qué no corre al lado', [
        'Broker de mensajes, Redis, Kubernetes, un segundo proceso de sincronización.',
      ]),
    ],
    adrIds: ['ADR-002', 'ADR-005', 'ADR-008', 'ADR-009', 'ADR-012'],
  },
  {
    id: 'dep-postgres',
    kicker: 'Datos',
    title: 'PostgreSQL',
    summary: 'Una base para todo el monolito. El proveedor de hospedaje no está elegido.',
    sections: [
      section('Esquemas de negocio', ['herd', 'growth', 'feeding', 'inventory', 'finance']),
      section('Esquemas técnicos', ['identity, cuentas y sesiones.', 'evidence, metadatos del archivo. Los bytes no van aquí.']),
      section('Clave foránea entre esquemas', [
        'Solo hacia herd.animal, y hacia herd.paddock_reference cuando el hecho de verdad depende de ese potrero.',
        'ON DELETE RESTRICT. Sin borrado en cascada.',
        'La clave no autoriza al otro módulo a modificar el hato.',
        'Hato no apunta con clave foránea a Finanzas, Crecimiento, Alimentación ni Inventario.',
        'Un id de venta en la salida, o un id de salida de stock en el lote, puede seguir siendo un UUID sin clave foránea.',
      ]),
      section('Migraciones', [
        'Una sola secuencia, ejecutada con un comando explícito.',
        'El proceso no migra al arrancar.',
      ]),
    ],
    adrIds: ['ADR-007', 'ADR-008', 'ADR-013'],
  },
  {
    id: 'dep-storage',
    kicker: 'Archivos',
    title: 'Almacenamiento de objetos',
    summary: 'Un puerto. En la laptop, el sistema de archivos. Al desplegar, un almacén compatible con S3. Ningún proveedor está elegido.',
    sections: [
      section('Regla', [
        'La ficha de negocio guarda el id de evidencia.',
        'La clave del objeto es {ranchId}/{evidenceId}.',
        'Corregir o desprender el hecho no borra los bytes históricos.',
      ]),
    ],
    adrIds: ['ADR-011', 'ADR-013'],
  },
]
