import { useEffect, useId, useState } from 'react'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { Chip } from '../../../components/ui/Chip.jsx'
import { ClockIcon, DownloadIcon, PencilIcon, PlusIcon, TrashIcon } from '../../../components/Icons/Icons.jsx'
import { useToast } from '../../../hooks/useToast.js'
import { estoqueService, relatoriosService } from '../../../services/gestaoService.js'
import { formatDateBr, todayIso } from '../../../utils/dates.js'
import { maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { MOTIVOS, qtd, SITUACOES, FILTROS_ESTOQUE } from './estoque.js'
import styles from './Estoque.module.css'

/** Faixa de indicadores no topo do catálogo + relatório em PDF. */
export function ResumoEstoque({ itens, filtro, onFiltro }) {
  const toast = useToast()
  const [baixando, setBaixando] = useState(false)
  const lista = Object.values(itens ?? {})
  const contar = (id) => lista.filter(FILTROS_ESTOQUE.find((f) => f.id === id).test).length
  const cards = [
    { id: 'todos', valor: lista.filter((i) => i.saldo > 0).length, rotulo: 'com estoque', tom: 'neutro' },
    { id: 'repor', valor: contar('repor'), rotulo: 'para repor', tom: 'perigo' },
    { id: 'validade', valor: contar('validade'), rotulo: 'vencendo', tom: 'alerta' },
    { id: 'emDia', valor: contar('emDia'), rotulo: 'em dia', tom: 'sucesso' },
  ]

  const relatorio = async () => {
    setBaixando(true)
    try {
      await relatoriosService.pdfEstoque()
      toast.success('Relatório de estoque baixado.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <section className={styles.resumo} aria-label="Resumo do estoque">
      <div className={styles.indicadores}>
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.indicador} ${styles[c.tom]} ${filtro === c.id && c.id !== 'todos' ? styles.indicadorAtivo : ''}`}
            onClick={() => onFiltro(filtro === c.id ? 'todos' : c.id)}
            aria-pressed={filtro === c.id && c.id !== 'todos'}
          >
            <strong>{itens ? c.valor : '–'}</strong>
            <span>{c.rotulo}</span>
          </button>
        ))}
      </div>
      <PillButton variant="contorno" onClick={relatorio} loading={baixando}>
        <DownloadIcon size={16} />
        Relatório de estoque (PDF)
      </PillButton>
    </section>
  )
}

/** Editar e excluir em ícones no canto do cartão. */
export function AcoesItem({ nome, onEditar, onExcluir }) {
  return (
    <div className={styles.acoesItem}>
      <button type="button" onClick={onEditar} aria-label={`Editar ${nome}`} title="Editar">
        <PencilIcon size={16} />
      </button>
      <button
        type="button"
        className={styles.excluir}
        onClick={onExcluir}
        aria-label={`Excluir ${nome}`}
        title="Excluir"
      >
        <TrashIcon size={16} />
      </button>
    </div>
  )
}

/** Janela "Ver detalhes" dos catálogos: o conteúdo do item, o estoque e os botões de editar e excluir. */
export function DetalhesItem({ titulo, descricao, estoque, onAcao, onEditar, onExcluir, onClose, children }) {
  return (
    <Dialog
      open
      onClose={onClose}
      title={titulo}
      description={descricao}
      footer={
        <>
          <PillButton variant="contorno" onClick={onExcluir}>
            Excluir
          </PillButton>
          <PillButton onClick={onEditar}>Editar</PillButton>
        </>
      }
    >
      <div className={styles.detalhes}>
        {children}
        <PainelEstoque item={estoque} onAcao={onAcao} />
      </div>
    </Dialog>
  )
}

/** Linha curta de estoque para o cartão do catálogo: quantidade e situação. */
export function EstoqueCompacto({ item }) {
  if (!item) return <p className={styles.compacto}>Carregando estoque…</p>
  const situacao = SITUACOES[item.situacao] ?? SITUACOES.Normal
  return (
    <p className={styles.compacto}>
      <strong>{qtd(item.saldo, item.unidade)}</strong>
      <Chip tone={situacao.tom} size="xs">
        {situacao.texto}
      </Chip>
    </p>
  )
}

/** Faixa de estoque no rodapé do cartão do medicamento/ração. */
export function PainelEstoque({ item, onAcao }) {
  if (!item) return <div className={styles.painel}>Carregando estoque…</div>
  const situacao = SITUACOES[item.situacao] ?? SITUACOES.Normal
  const referencia = Math.max(item.minimo ? item.minimo * 2 : 0, item.saldo, 1)
  const nivel = Math.min(100, (item.saldo / referencia) * 100)

  return (
    <div className={`${styles.painel} ${styles[`painel${situacao.tom}`]}`}>
      <div className={styles.painelTopo}>
        <strong className={styles.saldo}>{qtd(item.saldo, item.unidade)}</strong>
        <Chip tone={situacao.tom} size="xs">
          {situacao.texto}
        </Chip>
      </div>
      <div className={styles.barra} aria-hidden="true">
        <span style={{ width: `${nivel}%` }} />
        {item.minimo ? <i style={{ left: `${Math.min(100, (item.minimo / referencia) * 100)}%` }} /> : null}
      </div>
      <div className={styles.painelRodape}>
        <button type="button" className={styles.minimo} onClick={() => onAcao('minimo', item)}>
          {item.minimo ? `Mín. ${qtd(item.minimo, item.unidade)}` : 'Definir mínimo'}
          {item.proximaValidade ? ` · vence ${formatDateBr(item.proximaValidade)}` : ''}
        </button>
        <div className={styles.painelAcoes}>
          <button type="button" onClick={() => onAcao('entrada', item)} aria-label="Registrar entrada" title="Entrada">
            <PlusIcon size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => onAcao('saida', item)}
            disabled={item.saldo <= 0}
            aria-label="Registrar saída"
            title="Saída"
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            onClick={() => onAcao('historico', item)}
            aria-label="Lotes e histórico"
            title="Histórico"
          >
            <ClockIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Janela de entrada, saída ou mínimo. `acao`: entrada | saida | minimo. */
export function MovimentoDialog({ acao, item, nome, onClose, onSaved }) {
  const toast = useToast()
  const formId = useId()
  const [valores, setValores] = useState({
    quantidade: acao === 'minimo' && item.minimo != null ? String(item.minimo).replace('.', ',') : '',
    lote: '',
    validade: '',
    motivo: MOTIVOS[acao]?.[0] ?? '',
  })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const set = (campo, mascara) => (e) => {
    setValores((v) => ({ ...v, [campo]: mascara ? maskDecimal(e.target.value, 9) : e.target.value }))
    setErros((v) => ({ ...v, [campo]: '' }))
  }

  const titulos = {
    entrada: `Entrada de ${nome}`,
    saida: `Saída de ${nome}`,
    minimo: `Estoque mínimo de ${nome}`,
  }

  const salvar = async (e) => {
    e.preventDefault()
    const quantidade = parseDecimal(valores.quantidade)
    if (acao !== 'minimo' && !(quantidade > 0)) return setErros({ quantidade: 'Informe a quantidade.' })
    if (acao === 'saida' && quantidade > item.saldo)
      return setErros({ quantidade: `Só há ${qtd(item.saldo, item.unidade)} em estoque.` })

    setSalvando(true)
    try {
      const base = { categoria: item.categoria, itemId: item.itemId }
      const salvo =
        acao === 'entrada'
          ? await estoqueService.entrada({
              ...base,
              quantidade,
              lote: valores.lote.trim(),
              validade: valores.validade || null,
              motivo: valores.motivo,
            })
          : acao === 'saida'
            ? await estoqueService.saida({ ...base, quantidade, motivo: valores.motivo })
            : await estoqueService.minimo({ ...base, minimo: valores.quantidade === '' ? null : quantidade })
      toast.success(
        acao === 'minimo' ? 'Estoque mínimo salvo.' : `${acao === 'entrada' ? 'Entrada' : 'Saída'} registrada.`,
      )
      onSaved(salvo)
    } catch (err) {
      if (err.fields) setErros(err.fields.minimo ? { quantidade: err.fields.minimo } : err.fields)
      toast.error(err.message)
      setSalvando(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={titulos[acao]}
      description={
        acao === 'minimo'
          ? 'Abaixo deste saldo o item aparece como "estoque baixo". Deixe em branco para não avisar.'
          : `Saldo atual: ${qtd(item.saldo, item.unidade)}.${acao === 'saida' ? ' A saída usa primeiro o lote que vence antes.' : ''}`
      }
      footer={
        <>
          <PillButton variant="contorno" onClick={onClose} disabled={salvando}>
            Cancelar
          </PillButton>
          <PillButton type="submit" form={formId} loading={salvando}>
            {acao === 'minimo' ? 'Salvar mínimo' : `Registrar ${acao}`}
          </PillButton>
        </>
      }
    >
      <form id={formId} onSubmit={salvar} noValidate>
        <FieldGrid>
          <Field
            label={acao === 'minimo' ? `Mínimo (${item.unidade})` : `Quantidade (${item.unidade})`}
            required={acao !== 'minimo'}
            inputMode="decimal"
            autoFocus
            value={valores.quantidade}
            onChange={set('quantidade', true)}
            error={erros.quantidade}
          />
          {acao !== 'minimo' && (
            <Field
              label="Motivo"
              as="select"
              options={MOTIVOS[acao].map((m) => ({ value: m, label: m }))}
              value={valores.motivo}
              onChange={set('motivo')}
              error={erros.motivo}
            />
          )}
          {acao === 'entrada' && (
            <>
              <Field
                label="Lote"
                maxLength={40}
                placeholder="Ex.: L2026-118"
                value={valores.lote}
                onChange={set('lote')}
                error={erros.lote}
              />
              <Field
                label="Validade"
                type="date"
                min={todayIso()}
                value={valores.validade}
                onChange={set('validade')}
                error={erros.validade}
              />
            </>
          )}
        </FieldGrid>
      </form>
    </Dialog>
  )
}

/** Lotes atuais (com descarte) e o histórico de movimentações do item. */
export function HistoricoDialog({ item, nome, onClose, onSaved }) {
  const toast = useToast()
  const [movs, setMovs] = useState(null)
  const [descartando, setDescartando] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let ativo = true
    estoqueService
      .movimentacoes({ categoria: item.categoria, itemId: item.itemId, limite: 100 })
      .then((lista) => ativo && setMovs(lista))
      .catch((e) => ativo && toast.error(e.message))
    return () => {
      ativo = false
    }
  }, [item, toast])

  const descartar = async () => {
    setOcupado(true)
    try {
      const salvo = await estoqueService.descarte({
        categoria: item.categoria,
        itemId: item.itemId,
        loteId: descartando.id,
        motivo: descartando.vencido ? 'Lote vencido' : 'Descarte',
      })
      toast.success('Lote descartado.')
      setDescartando(null)
      onSaved(salvo)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Estoque de ${nome}`}
      size="lg"
      description="Lotes em estoque e últimas movimentações."
    >
      <h3 className={styles.secao}>Lotes</h3>
      {item.lotes.length === 0 ? (
        <p className={styles.vazio}>Nenhum lote em estoque.</p>
      ) : (
        <ul className={styles.lotes}>
          {item.lotes.map((l) => (
            <li key={l.id} className={l.vencido ? styles.loteVencido : l.venceEmBreve ? styles.loteAlerta : ''}>
              <div>
                <strong>{l.codigo || 'Sem número de lote'}</strong>
                <span>
                  {l.validade ? `Validade ${formatDateBr(l.validade)}` : 'Sem validade informada'}
                  {l.vencido ? ' · vencido' : l.venceEmBreve ? ' · vence em breve' : ''}
                </span>
              </div>
              <b>{qtd(l.quantidade, item.unidade)}</b>
              <PillButton variant="perigo" size="sm" onClick={() => setDescartando(l)}>
                Descartar
              </PillButton>
            </li>
          ))}
        </ul>
      )}

      <h3 className={styles.secao}>Movimentações</h3>
      {!movs ? (
        <p className={styles.vazio}>Carregando…</p>
      ) : movs.length === 0 ? (
        <p className={styles.vazio}>Nenhuma movimentação ainda.</p>
      ) : (
        <div className={styles.tabelaRolagem}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Saldo</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>
                    <Chip tone={m.tipo === 'Entrada' ? 'sucesso' : m.tipo === 'Descarte' ? 'perigo' : 'tag'} size="xs">
                      {m.tipo}
                    </Chip>
                  </td>
                  <td>{qtd(m.quantidade, item.unidade)}</td>
                  <td>{qtd(m.saldoApos, item.unidade)}</td>
                  <td>
                    {m.motivo}
                    {m.lotes ? <small> · lote {m.lotes}</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(descartando)}
        onClose={() => setDescartando(null)}
        onConfirm={descartar}
        loading={ocupado}
        title="Descartar este lote?"
        message={
          descartando
            ? `${qtd(descartando.quantidade, item.unidade)} do lote ${descartando.codigo || 'sem número'} saem do estoque.`
            : ''
        }
        confirmLabel="Descartar lote"
      />
    </Dialog>
  )
}
