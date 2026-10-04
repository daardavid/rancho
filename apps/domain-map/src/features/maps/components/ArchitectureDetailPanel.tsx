import { adrCatalog } from '../../../data/architecture/architectureDecisions.ts'
import { architectureDetail } from '../../../data/architecture/index.ts'
import { capabilityById, targetProcessById } from '../../../data/toBe/lookups.ts'

interface ArchitectureDetailPanelProps {
  detailId: string | null
  helpOpen: boolean
  onClose: () => void
}

const adrTitle = new Map(adrCatalog.map((item) => [item.id, item.title]))

export function ArchitectureDetailPanel({ detailId, helpOpen, onClose }: ArchitectureDetailPanelProps) {
  const detail = detailId ? architectureDetail(detailId) : undefined

  return (
    <aside className="tobe-panel" aria-label={helpOpen && !detail ? 'Cómo leer la arquitectura' : 'Detalle de arquitectura'}>
      <div className="tobe-panel__header">
        <div className="tobe-panel__heading">
          <div>
            <p className="detail-panel__kicker">{helpOpen && !detail ? 'Ayuda' : detail?.kicker}</p>
            <h2>{helpOpen && !detail ? 'Cómo leer' : detail?.title}</h2>
          </div>
          <button type="button" className="map-filter" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
      <div className="tobe-panel__body">
        {helpOpen && !detail ? <HelpBody /> : detail ? <DetailBody detail={detail} /> : null}
      </div>
    </aside>
  )
}

function HelpBody() {
  return (
    <>
      <p>Cada vista responde una pregunta. El detalle aparece al elegir un recuadro.</p>
      <h3>Contexto</h3>
      <p>Quién se relaciona con RANCHO y qué queda fuera. El trabajador puede contar lo que vio sin tener una cuenta.</p>
      <h3>Despliegue</h3>
      <p>Qué proceso y qué recursos correrían: un proceso Node, una base PostgreSQL y un almacén de archivos.</p>
      <h3>Módulos</h3>
      <p>Quién guarda cada verdad de negocio. La aplicación, arriba, coordina las capturas que tocan más de un módulo.</p>
      <h3>Flujos</h3>
      <p>Cómo cooperan los módulos en una sola captura. Lo que no cabe en el dibujo está en este panel.</p>
      <h3>Trazos</h3>
      <ul>
        <li>Línea continua: una llamada de la aplicación, en el momento.</li>
        <li>Línea discontinua: solo lectura, un canal humano, o algo futuro que no está integrado.</li>
        <li>Línea azul: la base de datos o el almacén de archivos.</li>
      </ul>
    </>
  )
}

function DetailBody({ detail }: { detail: NonNullable<ReturnType<typeof architectureDetail>> }) {
  return (
    <>
      <p>{detail.summary}</p>
      {detail.sections.map((section) =>
        section.text || section.items?.length ? (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            {section.text ? <p>{section.text}</p> : null}
            {section.items?.length ? (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null,
      )}
      {detail.targetIds?.length ? (
        <section>
          <h3>Procesos y capacidades</h3>
          <ul className="arch-trace">
            {detail.targetIds.map((id) => (
              <li key={id}>
                <span className="arch-trace__id">{id}</span>
                {traceLabel(id)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {detail.adrIds?.length ? (
        <section>
          <h3>Decisiones</h3>
          <ul className="arch-trace">
            {detail.adrIds.map((id) => (
              <li key={id}>
                <span className="arch-trace__id">{id}</span>
                {adrTitle.get(id)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function traceLabel(id: string): string {
  if (id.startsWith('CAP-')) return capabilityById[id]?.title ?? ''
  return targetProcessById[id]?.title ?? ''
}
