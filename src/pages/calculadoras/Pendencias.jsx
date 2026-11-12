import { CheckIcon } from '../../components/Icons/Icons.jsx'
import styles from './Calculadoras.module.css'

/** Cartão do resultado antes do cálculo: o que já foi preenchido e o que falta. */
export function Pendencias({ icone: Icone, titulo, itens }) {
  const faltam = itens.filter((i) => !i.ok).length
  return (
    <div className={styles.resultadoVazio}>
      <div className={styles.resultadoTopo}>
        <span className={styles.resultadoIcone} aria-hidden="true">
          <Icone size={24} />
        </span>
        <div>
          <p className={styles.resultadoTitulo}>{titulo}</p>
          <p className={styles.resultadoContagem}>{faltam === 1 ? 'Falta 1 campo' : `Faltam ${faltam} campos`}</p>
        </div>
      </div>
      <ul className={styles.pendencias}>
        {itens.map((i) => (
          <li key={i.rotulo} className={i.ok ? styles.pendenciaFeita : undefined}>
            <span className={styles.pendenciaMarca} aria-hidden="true">
              {i.ok && <CheckIcon size={14} strokeWidth={3} />}
            </span>
            {i.rotulo}
            <span className="visualmente-oculto">{i.ok ? ' (preenchido)' : ' (falta)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
