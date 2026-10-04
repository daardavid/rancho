import { useState } from 'react'
import { transversalFamilies } from '../../../data/toBe/lookups.ts'
import { SolutionFamilyCard } from './SolutionFamilyCard.tsx'

export function TransversalBand() {
  const [open, setOpen] = useState(false)

  return (
    <section className="transversal-band" aria-label="Principios transversales">
      <div className="transversal-band__row">
        <p className="transversal-band__summary">
          <span className="transversal-band__kicker">Principios de todo evento:</span> Declarado / Observado / Medido ·
          Evidencia · Canal conocido · Tolera captura posterior
        </p>
        <button type="button" className="map-filter" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Ocultar detalles' : 'Ver detalles'}
        </button>
      </div>
      {open ? (
        <div className="transversal-band__body">
          <ul className="transversal-band__points">
            <li>Fuente: declarado, observado o medido.</li>
            <li>Evidencia cuando exista.</li>
            <li>Canal y origen conocidos.</li>
            <li>Puede asentarse después, cuando la conectividad no permita capturarlo en el momento.</li>
          </ul>
          <p className="transversal-band__note">
            Calidad del dato, canal y señal acompañan al evento. No son operaciones junto al pesaje o la venta, y
            asentarse después no es una sincronización diseñada.
          </p>
          {transversalFamilies.map((family) => (
            <SolutionFamilyCard key={family.id} family={family} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
