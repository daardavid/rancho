import type { Edge, Node } from '@xyflow/react'
import type { ArchDetail, ArchNodeData } from '../../types/architecture.ts'
import { archEdge, archNode } from './nodeFactory.ts'

const section = (heading: string, items?: string[], text?: string) => ({ heading, items, text })

export const contextNodes: Node<ArchNodeData, 'archNode'>[] = [
  archNode('ctx-worker', 0, 24, 'actor', 'Sin cuenta', 'Trabajador / encargado', 'Ve el ganado y avisa. No entra a la aplicación.'),
  archNode('ctx-channel', 330, 24, 'channel', 'Canal humano', 'Teléfono, WhatsApp, foto o audio', 'El mensaje ya existe. WhatsApp no es un sistema integrado.'),
  archNode('ctx-owner', 660, 24, 'actor', 'Usuario inicial', 'Propietario / administrador', 'Registra el hecho cuando ya tiene el mensaje.'),
  archNode('ctx-system', 645, 200, 'system', 'Un monolito', 'RANCHO', 'Guarda el hecho, su calidad y el archivo que el propietario adjunte.'),
  archNode('ctx-vet', 0, 200, 'actor', 'Sin cuenta', 'Veterinario', 'Puede aparecer en una nota de salud. No tiene acceso.'),
  archNode('ctx-partner', 0, 360, 'actor', 'Lectura futura', 'Socio económico', 'Importa como tenencia y como nota. Hoy no entra a la aplicación.'),
  archNode('ctx-scale', 1040, 24, 'future', 'Futuro · no seleccionado', 'Báscula ganadera', 'Hoy el peso se transcribe. El protocolo no está elegido.'),
  archNode('ctx-messaging', 1040, 200, 'future', 'Futuro · no seleccionado', 'Integración de mensajes', 'El aviso y la captura siguen siendo humanos.'),
  archNode('ctx-security', 1040, 376, 'future', 'Futuro · no seleccionado', 'Seguridad física', 'Cámaras y sensores no están elegidos ni instalados.'),
]

export const contextEdges: Edge<{ kind: 'call' | 'read' | 'technical' }>[] = [
  archEdge('ctx-e1', 'ctx-worker', 'ctx-channel', 'read', 'right'),
  archEdge('ctx-e2', 'ctx-channel', 'ctx-owner', 'read', 'right'),
  archEdge('ctx-e3', 'ctx-owner', 'ctx-system', 'call', 'down', 'registra'),
  archEdge('ctx-e4', 'ctx-scale', 'ctx-system', 'read', 'left'),
  archEdge('ctx-e5', 'ctx-messaging', 'ctx-system', 'read', 'left'),
  archEdge('ctx-e6', 'ctx-security', 'ctx-system', 'read', 'left'),
]

export const contextDetails: ArchDetail[] = [
  {
    id: 'ctx-worker',
    kicker: 'Persona',
    title: 'Trabajador / encargado',
    summary: 'Es una fuente real de lo que pasó en el rancho. No es una cuenta de la aplicación.',
    sections: [
      section('Cómo entra la información', [
        'Habla con el propietario por teléfono, WhatsApp, foto o audio.',
        'El propietario escribe el hecho después.',
        'En el registro puede quedar como quien reportó, no como quien inició sesión.',
      ]),
    ],
    targetIds: ['TGT-COMM-001', 'CAP-COMM-001'],
  },
  {
    id: 'ctx-channel',
    kicker: 'Fuera del sistema',
    title: 'Teléfono, WhatsApp, foto o audio',
    summary: 'Es el camino humano que ya usa el rancho. No es una integración ni un archivo oficial.',
    sections: [
      section('Límite', [
        'WhatsApp no está conectado a RANCHO.',
        'Un mensaje ingerido, si algún día existe, seguiría siendo un dato declarado hasta que el propietario lo registre.',
      ]),
    ],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-COMM-001', 'CAP-COMM-001', 'CAP-CONN-001'],
  },
  {
    id: 'ctx-owner',
    kicker: 'Usuario inicial',
    title: 'Propietario / administrador',
    summary: 'Es quien afirma que un hecho puede entrar al sistema y quien lee el resumen y los avisos.',
    sections: [
      section('Acceso', ['La primera cuenta prevista es la suya.', 'El rol de aplicación se llama owner.']),
    ],
    adrIds: ['ADR-010'],
    targetIds: ['TGT-GOV-001', 'CAP-GOV-001'],
  },
  {
    id: 'ctx-system',
    kicker: 'Sistema',
    title: 'RANCHO',
    summary: 'Una aplicación. Registra hechos operativos del rancho y se los vuelve a mostrar al propietario.',
    sections: [
      section('Dentro', [
        'Cinco módulos de negocio, una capa de aplicación y lecturas.',
        'Evidencia, auditoría y sesiones son asuntos técnicos, no módulos.',
      ]),
      section('Fuera', [
        'La contabilidad fiscal.',
        'Detectar por sí solo un cerco cortado.',
        'Cuentas para trabajadores, el veterinario o el socio, en esta primera etapa.',
      ]),
    ],
    adrIds: ['ADR-002'],
  },
  {
    id: 'ctx-vet',
    kicker: 'Referencia',
    title: 'Veterinario',
    summary: 'Profesional ocasional. Una nota puede nombrar una visita o un producto sin crear un usuario.',
    sections: [section('Límite', ['No hay un módulo de salud ni un calendario de tratamientos.'])],
    targetIds: ['TGT-HEALTH-001', 'CAP-HEALTH-001'],
  },
  {
    id: 'ctx-partner',
    kicker: 'Referencia',
    title: 'Socio económico',
    summary: 'Importa como tenencia del ganado y como nota. El sistema no calcula su liquidación.',
    sections: [
      section('Lectura futura', [
        'El nombre partner-readonly está reservado y no está construido.',
        'Hoy no tiene acceso.',
      ]),
    ],
    adrIds: ['ADR-010'],
    targetIds: ['CAP-OWN-001'],
  },
  {
    id: 'ctx-scale',
    kicker: 'Futuro',
    title: 'Báscula ganadera',
    summary: 'El peso de hoy se anota a mano. Un adaptador futuro entregaría una medición normalizada a Crecimiento.',
    sections: [section('No elegido', ['No hay marca ni protocolo en el dominio.', 'No aparece un módulo nuevo para la báscula.'])],
    adrIds: ['ADR-005'],
    targetIds: ['TGT-WEIGH-001', 'CAP-GROW-001'],
  },
  {
    id: 'ctx-messaging',
    kicker: 'Futuro',
    title: 'Integración de mensajes',
    summary: 'Podría avisar al propietario o ofrecer un borrador. No está elegida y no es el bus entre módulos.',
    sections: [section('Hoy', ['El aviso mínimo es una lectura que el propietario ve al abrir la aplicación.'])],
    adrIds: ['ADR-004'],
    targetIds: ['TGT-COMM-001', 'TGT-GOV-001'],
  },
  {
    id: 'ctx-security',
    kicker: 'Futuro',
    title: 'Seguridad física',
    summary: 'Cámaras, luces o sensores se consideran y no están instalados. No hay módulo que los reciba.',
    sections: [section('Límite', ['Un dispositivo no marcaría un animal como ausente ni como salido.'])],
    targetIds: ['TGT-SEC-002', 'CAP-SEC-002'],
  },
]
