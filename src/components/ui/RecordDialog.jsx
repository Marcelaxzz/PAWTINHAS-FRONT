import { useId, useState } from 'react'
import { ConfirmDialog, Dialog } from './Dialog.jsx'
import { PillButton } from './PillButton.jsx'
import { StatusChip } from './Chip.jsx'
import { DownloadIcon, PencilIcon, TrashIcon } from '../Icons/Icons.jsx'
import { useToast } from '../../hooks/useToast.js'
import { todayIso } from '../../utils/dates.js'
import { BlocoRelatorio, RelatorioAtendimentoDialog } from './RelatorioAtendimento.jsx'
import styles from './RecordDialog.module.css'

/**
 * Detalhes de um agendamento: foto, dados, troca de status, edição e exclusão.
 * rows: [{ label, value }] · editTo: rota da tela de edição
 * eventoId: com ele, aparece o relatório do atendimento (preencher e baixar em PDF)
 */
export function RecordDialog({
  open,
  onClose,
  title,
  subtitle,
  photo,
  rows = [],
  status,
  statusOptions,
  onStatusChange,
  onDelete,
  deleteLabel = 'Excluir agendamento',
  editTo,
  extraActions,
  eventoId,
}) {
  const selectId = useId()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  // undefined: formulário fechado; null: relatório novo; objeto: editando o salvo.
  const [relatorio, setRelatorio] = useState(undefined)
  const [versao, setVersao] = useState(0)

  const run = async (action) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog
        open={open && !confirming && relatorio === undefined}
        onClose={onClose}
        title={title}
        description={subtitle}
        footer={
          <>
            {onDelete && (
              <PillButton variant="perigo" size="md" onClick={() => setConfirming(true)} disabled={busy}>
                <TrashIcon size={15} />
                {deleteLabel}
              </PillButton>
            )}
            {editTo && (
              <PillButton variant="contorno" size="md" to={editTo}>
                <PencilIcon size={15} />
                Editar
              </PillButton>
            )}
            {extraActions}
            <PillButton variant="solido" onClick={onClose}>
              Fechar
            </PillButton>
          </>
        }
      >
        <div className={styles.topo}>
          {photo && <img src={photo} alt="" className={styles.foto} />}
          {status && <StatusChip status={status} size="md" />}
        </div>

        <dl className={styles.lista}>
          {rows
            .filter((row) => row.value)
            .map((row) => (
              <div key={row.label} className={styles.item}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
        </dl>

        {statusOptions && onStatusChange && (
          <div className={styles.status}>
            <label htmlFor={selectId}>Alterar status</label>
            <select
              id={selectId}
              value={status}
              disabled={busy}
              onChange={(event) => run(() => onStatusChange(event.target.value))}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {eventoId && <BlocoRelatorio key={versao} eventoId={eventoId} onEditar={setRelatorio} />}
      </Dialog>

      {open && eventoId && relatorio !== undefined && (
        <RelatorioAtendimentoDialog
          eventoId={eventoId}
          titulo={[title, subtitle].filter(Boolean).join(' · ')}
          relatorio={relatorio}
          onClose={() => setRelatorio(undefined)}
          onSaved={() => {
            setRelatorio(undefined)
            setVersao((v) => v + 1)
          }}
        />
      )}

      <ConfirmDialog
        open={open && confirming}
        onClose={() => setConfirming(false)}
        title="Confirmar exclusão"
        message="Essa ação não pode ser desfeita. Deseja mesmo excluir este registro?"
        confirmLabel="Excluir"
        loading={busy}
        onConfirm={() =>
          run(async () => {
            await onDelete()
            setConfirming(false)
          })
        }
      />
    </>
  )
}

const diasAtras = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toLocaleDateString('sv-SE')
}

/**
 * Relatório simples: cartões de números + lista detalhada.
 * pdf: ({ de, ate }) => Promise; com ele aparece o download em PDF (com período se pdfPeriodo).
 */
export function ReportDialog({ open, onClose, title, description, stats = [], items = [], pdf, pdfPeriodo = true }) {
  const toast = useToast()
  const [periodo, setPeriodo] = useState(() => ({ de: diasAtras(30), ate: todayIso() }))
  const [baixando, setBaixando] = useState(false)

  const baixar = async () => {
    setBaixando(true)
    try {
      await pdf(pdfPeriodo ? periodo : {})
      toast.success('Relatório em PDF baixado.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <PillButton variant="solido" onClick={onClose}>
          Fechar
        </PillButton>
      }
    >
      <div className={styles.numeros}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.numero}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <ul className={styles.relatorio}>
          {items.map((item) => (
            <li key={item.id}>
              <span className={styles.relHora}>{item.when}</span>
              <span className={styles.relTexto}>
                <strong>{item.title}</strong>
                {item.detail && <span>{item.detail}</span>}
              </span>
              {item.status && <StatusChip status={item.status} />}
            </li>
          ))}
        </ul>
      )}
      {pdf && (
        <section className={styles.pdf} aria-label="Relatório em PDF">
          <div>
            <strong>Relatório completo em PDF</strong>
            <span>{pdfPeriodo ? 'Escolha o período e baixe o arquivo.' : 'Com todos os registros atuais.'}</span>
          </div>
          {pdfPeriodo && (
            <div className={styles.periodo}>
              <label>
                De
                <input
                  type="date"
                  value={periodo.de}
                  max={periodo.ate}
                  onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  value={periodo.ate}
                  min={periodo.de}
                  onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
                />
              </label>
            </div>
          )}
          <PillButton onClick={baixar} loading={baixando} disabled={pdfPeriodo && (!periodo.de || !periodo.ate)}>
            <DownloadIcon size={15} />
            Baixar PDF
          </PillButton>
        </section>
      )}
    </Dialog>
  )
}
