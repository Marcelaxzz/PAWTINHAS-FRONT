import styles from './Alarmes.module.css'
import { LIGACOES } from './ligacoesAlarme.js'

const Y = [62, 98, 134, 170, 236, 272, 308]

export function EsquemaAlarme() {
  return (
    <svg
      className={styles.esquema}
      viewBox="0 0 640 350"
      role="img"
      aria-label={`Esquema de ligação: ${LIGACOES.map((l) => `${l.peca} ${l.pino} no pino ${l.esp} do ESP32`).join(', ')}.`}
    >
      {/* ESP32 */}
      <rect x="30" y="28" width="190" height="304" rx="12" className={styles.placa} />
      <text x="62" y="186" className={styles.placaNome}>
        ESP32
      </text>
      <rect x="50" y="300" width="36" height="22" rx="4" className={styles.usb} />
      <text x="96" y="316" className={styles.placaApoio}>
        USB
      </text>

      {/* Display */}
      <rect x="420" y="34" width="190" height="158" rx="10" className={styles.modulo} />
      <rect x="500" y="56" width="96" height="44" rx="4" className={styles.tela} />
      <text x="548" y="84" textAnchor="middle" className={styles.telaTexto}>
        16x2
      </text>
      <text x="548" y="180" textAnchor="middle" className={styles.moduloNome}>
        Display LCD
      </text>

      {/* Buzzer */}
      <rect x="420" y="214" width="190" height="118" rx="10" className={styles.modulo} />
      <circle cx="560" cy="268" r="26" className={styles.buzzer} />
      <text x="560" y="322" textAnchor="middle" className={styles.moduloNome}>
        Buzzer
      </text>

      {LIGACOES.map((l, i) => (
        <g key={i}>
          <line x1="220" x2="420" y1={Y[i]} y2={Y[i]} stroke={l.cor} strokeWidth="5" strokeLinecap="round" />
          <circle cx="220" cy={Y[i]} r="5" fill={l.cor} />
          <circle cx="420" cy={Y[i]} r="5" fill={l.cor} />
          <text x="208" y={Y[i] + 5} textAnchor="end" className={styles.pinoPlaca}>
            {l.esp}
          </text>
          <text x="432" y={Y[i] + 5} className={styles.pinoModulo}>
            {l.pino}
          </text>
        </g>
      ))}
    </svg>
  )
}
