import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../../components/ui/Dialog.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { StatusChip } from '../../../components/ui/Chip.jsx'
import { BowlIcon, ChipIcon, PillIcon, TrashIcon } from '../../../components/Icons/Icons.jsx'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { addDaysIso, formatDateBr, todayIso } from '../../../utils/dates.js'
import { formatNumber, formatQuantidade, intervaloLabel } from '../../../utils/numbers.js'
import styles from './PacienteFicha.module.css'

const STATUS_PRESCRICAO = ['Ativa', 'Suspensa', 'Concluída']

/** Último dia de tratamento: início + duração − 1. */
function fimDoTratamento(p) {
  return addDaysIso(p.duracaoDias - 1, new Date(`${p.inicio}T12:00:00`))
}

/** Em que dia do tratamento estamos: "Dia 3 de 7" e quanto da barra preencher. */
function progresso(p) {
  const hoje = todayIso()
  if (!p.inicio || !p.duracaoDias) return null
  if (p.inicio > hoje) return { porcento: 0, texto: `Começa em ${formatDateBr(p.inicio)}` }
  const passados = Math.round((new Date(`${hoje}T12:00:00`) - new Date(`${p.inicio}T12:00:00`)) / 86400000)
  const dia = Math.min(p.duracaoDias, passados + 1)
  const faltam = p.duracaoDias - dia
  return {
    porcento: (dia / p.duracaoDias) * 100,
    texto: `Dia ${dia} de ${p.duracaoDias}${faltam === 0 ? ' · último dia' : ` · ${faltam === 1 ? 'falta 1 dia' : `faltam ${faltam} dias`}`}`,
  }
}

/** "Ativa" vira "Concluída" na tela quando o período já terminou. */
function statusExibido(p) {
  return p.status === 'Ativa' && fimDoTratamento(p) < todayIso() ? 'Concluída' : p.status
}

function BarraDoTratamento({ p }) {
  const andamento = progresso(p)
  if (!andamento) return null
  return (
    <div className={styles.progresso}>
      <span
        className={styles.progressoTrilho}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(andamento.porcento)}
        aria-label={`Andamento do tratamento com ${p.medicamento}`}
      >
        <span style={{ width: `${andamento.porcento}%` }} />
      </span>
      <small>{andamento.texto}</small>
    </div>
  )
}

export function Tratamentos({ pet, prescricoes, patchLocal }) {
  const toast = useToast()
  const [excluindo, setExcluindo] = useState(null)
  const [ocupado, setOcupado] = useState(null)

  const alterarStatus = async (p, status) => {
    setOcupado(p.id)
    try {
      patchLocal('prescricoes', await dataService.update('prescricoes', p.id, { status }))
      toast.success(
        p.alarmeId && status !== 'Ativa'
          ? `Tratamento ${status.toLowerCase()} e alarme pausado.`
          : 'Status atualizado.',
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const excluir = async () => {
    setOcupado(excluindo.id)
    try {
      await dataService.remove('prescricoes', excluindo.id)
      patchLocal('prescricoes', excluindo, 'remove')
      toast.success('Prescrição excluída.')
      setExcluindo(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section className={styles.cuidado} aria-labelledby="titulo-tratamentos">
      <header className={styles.cuidadoTopo}>
        <h2 id="titulo-tratamentos" className={styles.subtitulo}>
          <PillIcon size={20} /> Tratamentos
        </h2>
        <PillButton size="sm" to={`/calculadoras/dose?pet=${encodeURIComponent(pet.id)}`}>
          Calcular dose
        </PillButton>
      </header>

      {prescricoes.length === 0 ? (
        <p className={styles.vazio}>Nenhuma prescrição registrada.</p>
      ) : (
        <ul className={styles.cuidadoLista}>
          {prescricoes.map((p) => {
            const status = statusExibido(p)
            return (
              <li key={p.id} className={styles.cuidadoItem}>
                <div className={styles.cuidadoLinha}>
                  <strong className={styles.cuidadoNome}>{p.medicamento}</strong>
                  <StatusChip status={status} />
                </div>
                <p className={styles.cuidadoDose}>
                  {formatQuantidade(p.quantidadePorDose, p.unidade)} ({formatNumber(p.doseRealMg, 2)} mg) ·{' '}
                  {intervaloLabel(p.intervaloHoras)}
                </p>
                <p className={styles.cuidadoApoio}>
                  {formatNumber(p.doseMgKg, 3)} mg/kg para {formatNumber(p.pesoKg, 2)} kg · {formatDateBr(p.inicio)} a{' '}
                  {formatDateBr(fimDoTratamento(p))} · 1ª dose às {p.horaPrimeiraDose} · total{' '}
                  {formatQuantidade(p.quantidadeTotal, p.unidade)}
                </p>
                {status === 'Ativa' && <BarraDoTratamento p={p} />}
                {p.alarmeId && (
                  <p className={styles.cuidadoApoio}>
                    <ChipIcon size={14} /> Alarme no ESP32
                  </p>
                )}
                {p.alertasConfirmados && (
                  <p className={styles.cuidadoAlerta}>Alertas confirmados: {p.alertasConfirmados}</p>
                )}
                {p.observacoes && <p className={styles.cuidadoApoio}>{p.observacoes}</p>}
                <div className={styles.cuidadoAcoes}>
                  <label className={styles.cuidadoStatus}>
                    <span className="visualmente-oculto">Status de {p.medicamento}</span>
                    <select
                      value={p.status}
                      disabled={ocupado === p.id}
                      onChange={(e) => alterarStatus(p, e.target.value)}
                    >
                      {STATUS_PRESCRICAO.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={styles.cuidadoExcluir}
                    onClick={() => setExcluindo(p)}
                    aria-label={`Excluir prescrição de ${p.medicamento}`}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(excluindo)}
        onClose={() => setExcluindo(null)}
        onConfirm={excluir}
        loading={Boolean(ocupado)}
        title="Excluir prescrição?"
        message={
          excluindo?.alarmeId
            ? 'A prescrição e o alarme do ESP32 ligado a ela serão removidos.'
            : 'A prescrição será removida da ficha.'
        }
        confirmLabel="Excluir"
      />
    </section>
  )
}

export function Alimentacao({ pet, planos, patchLocal }) {
  const toast = useToast()
  const [excluindo, setExcluindo] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [atual, ...anteriores] = planos

  const excluir = async () => {
    setOcupado(true)
    try {
      await dataService.remove('planosAlimentares', excluindo.id)
      patchLocal('planosAlimentares', excluindo, 'remove')
      toast.success('Plano alimentar excluído.')
      setExcluindo(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className={styles.cuidado} aria-labelledby="titulo-alimentacao">
      <header className={styles.cuidadoTopo}>
        <h2 id="titulo-alimentacao" className={styles.subtitulo}>
          <BowlIcon size={20} /> Alimentação
        </h2>
        <PillButton size="sm" to={`/calculadoras/racao?pet=${encodeURIComponent(pet.id)}`}>
          Calcular ração
        </PillButton>
      </header>

      {!atual ? (
        <p className={styles.vazio}>Nenhum plano alimentar calculado.</p>
      ) : (
        <>
          <div className={styles.plano}>
            <p className={styles.planoGramas}>
              {formatNumber(atual.gramasDia, atual.gramasDia < 100 ? 1 : 0)} g<span>/dia</span>
            </p>
            <p className={styles.cuidadoDose}>
              {atual.refeicoes} × {formatNumber(atual.gramasPorRefeicao, 1)} g de {atual.racao}
            </p>
            <dl className={styles.planoDados}>
              <div>
                <dt>Condição</dt>
                <dd>{atual.condicao}</dd>
              </div>
              <div>
                <dt>Energia</dt>
                <dd>{formatNumber(atual.mer, 0)} kcal/dia</dd>
              </div>
              <div>
                <dt>Peso usado</dt>
                <dd>{formatNumber(atual.pesoCalculoKg, 2)} kg</dd>
              </div>
              <div>
                <dt>Petiscos</dt>
                <dd>até {formatNumber(atual.kcalPetiscosMax, 0)} kcal</dd>
              </div>
              <div>
                <dt>Água</dt>
                <dd>≈ {formatNumber(atual.aguaMlDia, 0)} mL</dd>
              </div>
              <div>
                <dt>Calculado em</dt>
                <dd>{formatDateBr(atual.criadoEm.slice(0, 10))}</dd>
              </div>
            </dl>
            {atual.observacoes && <p className={styles.cuidadoApoio}>{atual.observacoes}</p>}
          </div>

          <ul className={styles.planosAnteriores}>
            {[atual, ...anteriores].map((p, index) => (
              <li key={p.id}>
                <span>
                  {formatDateBr(p.criadoEm.slice(0, 10))} · {formatNumber(p.gramasDia, p.gramasDia < 100 ? 1 : 0)} g/dia
                  · {p.racao}
                  {index === 0 && ' (atual)'}
                </span>
                <button
                  type="button"
                  className={styles.cuidadoExcluir}
                  onClick={() => setExcluindo(p)}
                  aria-label={`Excluir plano de ${formatDateBr(p.criadoEm.slice(0, 10))}`}
                >
                  <TrashIcon size={15} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={Boolean(excluindo)}
        onClose={() => setExcluindo(null)}
        onConfirm={excluir}
        loading={ocupado}
        title="Excluir plano alimentar?"
        message="O cálculo será removido do histórico do paciente."
        confirmLabel="Excluir"
      />
    </section>
  )
}
