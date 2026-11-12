import { useEffect, useId, useState } from 'react'
import { Dialog } from './Dialog.jsx'
import { Field, FieldGrid } from './Field.jsx'
import { PillButton } from './PillButton.jsx'
import { DownloadIcon, PencilIcon } from '../Icons/Icons.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useToast } from '../../hooks/useToast.js'
import { relatoriosService } from '../../services/gestaoService.js'
import { formatDateBr } from '../../utils/dates.js'
import { maskDecimal, parseDecimal } from '../../utils/numbers.js'
import styles from './RelatorioAtendimento.module.css'

const decimal = (n) => (n == null ? '' : String(n).replace('.', ','))

/**
 * Bloco dentro dos detalhes do atendimento: mostra se já há relatório, abre o formulário
 * e baixa o PDF. onEditar/onFechado deixam a janela de detalhes sumir enquanto o formulário está aberto.
 */
export function BlocoRelatorio({ eventoId, onEditar }) {
  const toast = useToast()
  const [relatorio, setRelatorio] = useState(undefined)
  const [baixando, setBaixando] = useState(false)

  useEffect(() => {
    let ativo = true
    relatoriosService
      .obterAtendimento(eventoId)
      .then((r) => ativo && setRelatorio(r))
      .catch(() => ativo && setRelatorio(null))
    return () => {
      ativo = false
    }
  }, [eventoId])

  const baixar = async () => {
    setBaixando(true)
    try {
      await relatoriosService.pdfAtendimento(eventoId)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <section className={styles.bloco} aria-label="Relatório do atendimento">
      <div>
        <strong>Relatório do atendimento</strong>
        <span>
          {relatorio === undefined
            ? 'Carregando…'
            : relatorio
              ? `Preenchido · atualizado em ${formatDateBr(relatorio.atualizadoEm.slice(0, 10))}`
              : 'Ainda não preenchido'}
        </span>
      </div>
      <div className={styles.acoes}>
        <PillButton size="sm" variant={relatorio ? 'contorno' : 'solido'} onClick={() => onEditar(relatorio ?? null)}>
          <PencilIcon size={14} />
          {relatorio ? 'Editar' : 'Preencher'}
        </PillButton>
        <PillButton size="sm" variant="contorno" onClick={baixar} loading={baixando}>
          <DownloadIcon size={14} />
          PDF
        </PillButton>
      </div>
    </section>
  )
}

/** Formulário do relatório de um atendimento (consulta, cirurgia, banho, visita, emergência ou vacina). */
export function RelatorioAtendimentoDialog({ eventoId, titulo, relatorio, onClose, onSaved }) {
  const toast = useToast()
  const { user } = useAuth()
  const formId = useId()
  const [valores, setValores] = useState(() => ({
    queixa: relatorio?.queixa ?? '',
    avaliacao: relatorio?.avaliacao ?? '',
    procedimentos: relatorio?.procedimentos ?? '',
    diagnostico: relatorio?.diagnostico ?? '',
    orientacoes: relatorio?.orientacoes ?? '',
    pesoKg: decimal(relatorio?.pesoKg),
    temperaturaC: decimal(relatorio?.temperaturaC),
    retorno: relatorio?.retorno ?? '',
    responsavel: relatorio?.responsavel ?? user?.name ?? '',
  }))
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const set = (campo, mascara) => (e) => {
    setValores((v) => ({ ...v, [campo]: mascara ? maskDecimal(e.target.value, 5) : e.target.value }))
    setErros((v) => ({ ...v, [campo]: '' }))
  }

  const salvar = async (baixarDepois) => {
    setSalvando(true)
    try {
      const salvo = await relatoriosService.salvarAtendimento(eventoId, {
        ...valores,
        pesoKg: parseDecimal(valores.pesoKg),
        temperaturaC: parseDecimal(valores.temperaturaC),
        retorno: valores.retorno || null,
      })
      toast.success('Relatório salvo.')
      if (baixarDepois) await relatoriosService.pdfAtendimento(eventoId)
      onSaved(salvo)
    } catch (err) {
      if (err.fields) setErros(err.fields)
      toast.error(err.message)
      setSalvando(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Relatório do atendimento"
      description={titulo}
      size="lg"
      footer={
        <>
          <PillButton variant="contorno" onClick={onClose} disabled={salvando}>
            Cancelar
          </PillButton>
          <PillButton variant="contorno" onClick={() => salvar(true)} loading={salvando}>
            <DownloadIcon size={15} />
            Salvar e baixar PDF
          </PillButton>
          <PillButton type="submit" form={formId} loading={salvando}>
            Salvar relatório
          </PillButton>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          salvar(false)
        }}
      >
        <FieldGrid>
          <Field
            label="Queixa principal"
            as="textarea"
            span={2}
            maxLength={1000}
            placeholder="O que o tutor relatou: sintomas, desde quando, mudanças de comportamento…"
            value={valores.queixa}
            onChange={set('queixa')}
            error={erros.queixa}
          />
          <Field
            label="Peso (kg)"
            inputMode="decimal"
            value={valores.pesoKg}
            onChange={set('pesoKg', true)}
            error={erros.pesoKg}
          />
          <Field
            label="Temperatura (°C)"
            inputMode="decimal"
            placeholder="Ex.: 38,5"
            value={valores.temperaturaC}
            onChange={set('temperaturaC', true)}
            error={erros.temperaturaC}
          />
          <Field
            label="Avaliação e exame físico"
            as="textarea"
            span={2}
            maxLength={2000}
            placeholder="Mucosas, hidratação, ausculta, pele, dor…"
            value={valores.avaliacao}
            onChange={set('avaliacao')}
            error={erros.avaliacao}
          />
          <Field
            label="Procedimentos realizados"
            as="textarea"
            span={2}
            maxLength={2000}
            value={valores.procedimentos}
            onChange={set('procedimentos')}
            error={erros.procedimentos}
          />
          <Field
            label="Diagnóstico"
            as="textarea"
            span={2}
            maxLength={1000}
            value={valores.diagnostico}
            onChange={set('diagnostico')}
            error={erros.diagnostico}
          />
          <Field
            label="Orientações ao tutor"
            as="textarea"
            span={2}
            maxLength={2000}
            placeholder="Medicação, cuidados em casa, alimentação, sinais de alerta…"
            value={valores.orientacoes}
            onChange={set('orientacoes')}
            error={erros.orientacoes}
          />
          <Field label="Retorno" type="date" value={valores.retorno} onChange={set('retorno')} error={erros.retorno} />
          <Field
            label="Assinatura"
            maxLength={120}
            placeholder="Nome e CRMV"
            hint="Aparece no fim do PDF."
            value={valores.responsavel}
            onChange={set('responsavel')}
            error={erros.responsavel}
          />
        </FieldGrid>
      </form>
    </Dialog>
  )
}
