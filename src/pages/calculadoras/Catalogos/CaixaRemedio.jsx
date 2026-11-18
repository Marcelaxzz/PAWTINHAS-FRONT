import { caixaDoRemedio } from './caixaRemedio.js'

/** Posição de cada linha da frente da caixa: o nome, o princípio ativo e, embaixo, a concentração. */
function posicoes(c) {
  const tamTitulo = c.titulo.length <= 2 ? 21 : 18
  const titulo = c.titulo.map((texto, i) => ({ texto, y: 112 + i * (tamTitulo + 3) }))
  const inicioAtivo = 112 + c.titulo.length * (tamTitulo + 3) + 2
  const ativo = c.ativo.map((texto, i) => ({ texto, y: inicioAtivo + i * 13 }))
  return { tamTitulo, titulo, ativo, pillY: inicioAtivo + c.ativo.length * 13 + 4 }
}

/** Desenho da caixa do medicamento (regras em caixaRemedio.js): frente, lateral e tampa. */
export function CaixaRemedio({ medicamento }) {
  const c = caixaDoRemedio(medicamento)
  const { tamTitulo, titulo, ativo, pillY } = posicoes(c)
  const larguraPill = Math.max(64, c.concentracao.length * 10.5 + 22)

  return (
    <svg viewBox="0 0 250 300" role="img" aria-label={`Caixa de ${medicamento.nome}`} style={{ fontFamily: 'inherit' }}>
      {/* tampa e lateral */}
      <polygon points="14,46 48,16 228,16 194,46" fill="#efe7dc" />
      <polygon points="194,46 228,16 228,260 194,290" fill={c.cor} />
      <polygon points="194,46 228,16 228,260 194,290" fill="#000" opacity="0.28" />
      {/* frente */}
      <rect x="14" y="46" width="180" height="244" fill="#fffdf9" />
      <polygon points="14,262 194,196 194,262" fill={c.cor} opacity="0.1" />
      <rect x="14" y="46" width="180" height="38" fill={c.cor} />
      <text x="26" y="70" fontSize="11" fontWeight="800" letterSpacing="1.6" fill="#fff">
        USO VETERINÁRIO
      </text>

      {titulo.map((l) => (
        <text key={`t${l.y}`} x="26" y={l.y} fontSize={tamTitulo} fontWeight="800" fill="#2a1c12">
          {l.texto}
        </text>
      ))}
      {ativo.map((l) => (
        <text key={`a${l.y}`} x="26" y={l.y} fontSize="10.5" fill="#6b5a4c">
          {l.texto}
        </text>
      ))}

      <rect x="26" y={pillY} width={larguraPill} height="30" rx="8" fill={c.cor} />
      <text x="37" y={pillY + 21} fontSize="17" fontWeight="800" fill="#fff">
        {c.concentracao}
      </text>
      {c.extra && (
        <text x="26" y={pillY + 48} fontSize="11.5" fontWeight="700" fill={c.cor}>
          {c.extra}
        </text>
      )}

      <text x="26" y="236" fontSize="11.5" fontWeight="700" fill="#4a3a2e">
        {c.forma}
      </text>
      <text x="26" y="251" fontSize="10.5" fill="#6b5a4c">
        {c.via}
      </text>

      {/* tarja vermelha */}
      <rect x="14" y="262" width="180" height="28" fill="#d42a2f" />
      <text x="104" y="273.5" fontSize="7.6" fontWeight="800" fill="#fff" textAnchor="middle" letterSpacing="0.3">
        VENDA SOB PRESCRIÇÃO DO
      </text>
      <text x="104" y="284" fontSize="7.6" fontWeight="800" fill="#fff" textAnchor="middle" letterSpacing="0.3">
        MÉDICO VETERINÁRIO
      </text>
      <rect x="14" y="46" width="180" height="244" fill="none" stroke="#000" strokeOpacity="0.08" />
    </svg>
  )
}
