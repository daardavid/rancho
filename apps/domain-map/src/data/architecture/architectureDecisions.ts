export interface AdrEntry {
  id: string
  title: string
}

export const adrCatalog: AdrEntry[] = [
  { id: 'ADR-001', title: 'Mapas de dominio como código' },
  { id: 'ADR-002', title: 'Monolito modular' },
  { id: 'ADR-003', title: 'Orquestación en la aplicación' },
  { id: 'ADR-004', title: 'Sin bus de eventos entre módulos' },
  { id: 'ADR-005', title: 'TypeScript, Node y Fastify' },
  { id: 'ADR-006', title: 'React y Vite' },
  { id: 'ADR-007', title: 'PostgreSQL, un esquema por módulo' },
  { id: 'ADR-008', title: 'Drizzle en los repositorios' },
  { id: 'ADR-009', title: 'REST con comandos y Zod' },
  { id: 'ADR-010', title: 'Sesiones por cookie' },
  { id: 'ADR-011', title: 'Puerto de evidencia' },
  { id: 'ADR-012', title: 'Índice público y prueba de imports' },
  { id: 'ADR-013', title: 'RanchId como alcance de los datos' },
]

export const frozenBaseline = [
  'Monolito modular',
  'React / Vite / TypeScript',
  'Node / Fastify',
  'REST / Zod',
  'PostgreSQL / Drizzle',
  'Cinco módulos',
  'Un proceso Node',
  'Una base PostgreSQL',
]

export const openImplementation = [
  'Biblioteca de autenticación',
  'Proveedor de hospedaje',
  'Catálogo de rutas',
  'Formato del código visible',
  'Protocolo de la báscula',
  'Sincronización sin conexión',
  'Aviso fuera de la aplicación',
]
