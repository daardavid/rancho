import { asIsProcessById } from '../../../data/asIsProcesses.ts'
import { openQuestionById } from '../../../data/openQuestions.ts'
import { painPointById } from '../../../data/painPoints.ts'
import type { AsIsFlowNode } from '../../../data/asIsMap.ts'
import {
  confidenceLabels,
  severityLabels,
  statusLabels,
  type ProcessNodeData,
  type SectionNodeData,
} from '../../../types/map.ts'

interface DetailPanelProps {
  node: AsIsFlowNode | null
}

export function DetailPanel({ node }: DetailPanelProps) {
  return (
    <aside className="detail-panel" aria-label="Detalle del mapa AS-IS">
      {node?.type === 'process' ? (
        <ProcessDetail data={node.data} />
      ) : node?.type === 'section' ? (
        <SectionDetail data={node.data} />
      ) : (
        <EmptyDetail />
      )}
    </aside>
  )
}

function EmptyDetail() {
  return (
    <div className="detail-panel__content">
      <p className="detail-panel__kicker">AS-IS</p>
      <h2>Operación actual</h2>
      <p>
        Este mapa muestra lo que el rancho hace hoy, según las entrevistas. No propone soluciones ni incluye la
        ordeña: la leche es historia y una intención, no una operación vigente.
      </p>
      <p>Seleccione un proceso para ver cómo funciona, quién interviene y qué sigue sin saberse.</p>
      <h3>Incertidumbres que el mapa no cierra</h3>
      <ul>
        <li>Las cantidades conocidas de alimentación requieren validación.</li>
        <li>La cobertura celular es limitada/no confiable; pendiente de validación.</li>
        <li>Ocho potreros no describen las aproximadamente 530 hectáreas.</li>
        <li>El arreglo «a la parte» no se reinterpreta.</li>
      </ul>
      <p className="detail-panel__note">
        El dolor PP-MILK-001 está en el descubrimiento y no cuelga de ningún proceso, para no dibujar la leche como
        actividad actual.
      </p>
    </div>
  )
}

function SectionDetail({ data }: { data: SectionNodeData }) {
  return (
    <div className="detail-panel__content">
      <p className="detail-panel__kicker">Sección</p>
      <h2>{data.title}</h2>
      <p>{data.summary}</p>
      <h3>Procesos</h3>
      <ul>
        {data.processIds.map((processId) => (
          <li key={processId}>
            <span className="mono">{processId}</span> {asIsProcessById[processId]?.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProcessDetail({ data }: { data: ProcessNodeData }) {
  return (
    <div className="detail-panel__content">
      <p className="detail-panel__kicker">{data.categoryLabel}</p>
      <h2>{data.title}</h2>
      <dl>
        <Field label="ID del proceso" value={data.processId} mono />
        <Field label="Categoría" value={data.categoryLabel} />
        <Field label="Estado actual" value={statusLabels[data.status]} />
        <Field label="Descripción" value={data.shortDescription} />
      </dl>

      {data.warnings.map((warning) => (
        <p key={warning} className="detail-warning" role="note">
          {warning}
        </p>
      ))}

      <h3>Cómo funciona hoy</h3>
      <p>{data.currentProcess}</p>

      <h3>Actores</h3>
      <ItemList items={data.actors} empty="No se nombró un actor adicional." />

      <h3>Entradas</h3>
      <ItemList items={data.inputs} empty="Sin entradas descritas." />

      <h3>Salidas</h3>
      <ItemList items={data.outputs} empty="Sin salidas descritas." />

      <h3>Fuentes actuales</h3>
      <ItemList items={data.dataSources} empty="Sin fuente descrita." />

      <h3>Puntos de dolor</h3>
      {data.painPointIds.length === 0 ? (
        <p>Ningún dolor del descubrimiento está ligado a este proceso.</p>
      ) : (
        <div className="pain-list">
          {data.painPointIds.map((painPointId) => {
            const painPoint = painPointById[painPointId]
            if (!painPoint) return null
            return (
              <article key={painPoint.id} className="pain-card">
                <header className="pain-card__header">
                  <span className="mono">{painPoint.id}</span>
                  <span className={`severity-chip severity-${painPoint.initialSeverity}`}>
                    Evaluación inicial: {severityLabels[painPoint.initialSeverity]}
                  </span>
                </header>
                <h4>{painPoint.title}</h4>
                <p>
                  <strong>Impacto. </strong>
                  {painPoint.impact}
                </p>
                <p>
                  <strong>Situación. </strong>
                  {painPoint.currentSituation}
                </p>
                <p>
                  <strong>Evidencia. </strong>
                  {painPoint.evidence}
                </p>
                <p className="pain-card__meta">
                  {`Confianza del relato: ${confidenceLabels[painPoint.confidence]}${painPoint.notes ? `. ${painPoint.notes}` : ''}`}
                </p>
              </article>
            )
          })}
        </div>
      )}

      <h3>Preguntas abiertas</h3>
      {data.openQuestionIds.length === 0 ? (
        <p>Ninguna pregunta abierta está ligada de forma directa.</p>
      ) : (
        <ul>
          {data.openQuestionIds.map((questionId) => (
            <li key={questionId}>
              <span className="mono">{questionId}</span> {openQuestionById[questionId] ?? 'Pregunta sin texto.'}
            </li>
          ))}
        </ul>
      )}

      {data.notes.length > 0 ? (
        <>
          <h3>Notas</h3>
          <ItemList items={data.notes} empty="" />
        </>
      ) : null}
    </div>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{value}</dd>
    </div>
  )
}

function ItemList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p>{empty}</p>
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
