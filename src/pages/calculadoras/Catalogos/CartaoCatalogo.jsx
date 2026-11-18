import { Chip } from '../../../components/ui/Chip.jsx'
import { ArrowRightIcon } from '../../../components/Icons/Icons.jsx'
import { qtd, SITUACOES } from './estoque.js'
import styles from './CartaoCatalogo.module.css'

/**
 * Cartão dos catálogos (rações, medicamentos e materiais): a foto real do produto na lateral, o nome,
 * o número que mais importa (quando houver) e o estoque. O resto fica em "Ver detalhes".
 * ajuste "inteira" mostra a embalagem toda (rações e caixas de remédio); "preenche" cobre o espaço
 * (fotos de materiais, que têm fundo). `ilustracao` troca a foto por um desenho (caixa do remédio).
 */
export function CartaoCatalogo({
  foto,
  ilustracao,
  ajuste = 'inteira',
  etiquetas = [],
  titulo,
  apoio,
  destaque,
  estoque,
  onDetalhes,
}) {
  const situacao = estoque ? (SITUACOES[estoque.situacao] ?? SITUACOES.Normal) : null
  return (
    <article className={styles.cartao}>
      <button
        type="button"
        className={`${styles.foto} ${ajuste === 'preenche' ? styles.preenche : ''}`}
        onClick={onDetalhes}
        aria-label={`Ver detalhes de ${titulo}`}
      >
        {ilustracao ?? <img src={foto} alt="" loading="lazy" />}
      </button>

      <div className={styles.corpo}>
        <span className={styles.etiquetas}>
          {etiquetas.filter(Boolean).map((e) => (
            <span key={e}>{e}</span>
          ))}
        </span>
        <h2 className={styles.titulo}>{titulo}</h2>
        {apoio && <p className={styles.apoio}>{apoio}</p>}

        <div className={styles.numeros}>
          {destaque && (
            <p className={styles.destaque}>
              <strong>{destaque.valor}</strong>
              <span>{destaque.unidade}</span>
            </p>
          )}
          {estoque ? (
            <div className={`${styles.estoque} ${destaque ? '' : styles.estoqueSozinho}`}>
              <strong>{qtd(estoque.saldo, estoque.unidade)}</strong>
              <Chip tone={situacao.tom} size="xs">
                {situacao.texto}
              </Chip>
            </div>
          ) : (
            <span className={styles.apoio}>Carregando estoque…</span>
          )}
        </div>

        <button type="button" className={styles.detalhes} onClick={onDetalhes}>
          Ver detalhes
          <ArrowRightIcon size={18} />
        </button>
      </div>
    </article>
  )
}
