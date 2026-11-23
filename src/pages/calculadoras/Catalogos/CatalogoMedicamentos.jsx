import { useId, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PlusIcon } from '../../../components/Icons/Icons.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { formatNumber, intervaloCurto, intervaloLabel, maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { CALCULADORAS_TABS } from '../calculadorasTabs.js'
import { CATEGORIA } from '../../../services/gestaoService.js'
import { CartaoCatalogo } from './CartaoCatalogo.jsx'
import { CaixaRemedio } from './CaixaRemedio.jsx'
import { HistoricoDialog, MovimentoDialog, PainelEstoque, ResumoEstoque } from './Estoque.jsx'
import { FILTROS_ESTOQUE, useEstoque } from './estoque.js'
import styles from '../Calculadoras.module.css'

const FORMAS = ['Comprimido', 'Cápsula', 'Solução oral', 'Suspensão oral', 'Gotas', 'Injetável']
const VIAS = ['Oral', 'Subcutânea', 'Intramuscular', 'Intravenosa']
const INTERVALOS = [4, 6, 8, 12, 24, 48, 72]
const UNIDADE_DA_FORMA = {
  Comprimido: 'mg por comprimido',
  Cápsula: 'mg por cápsula',
  'Solução oral': 'mg por mL',
  'Suspensão oral': 'mg por mL',
  Gotas: 'mg por gota',
  Injetável: 'mg por mL',
}
const CONCENTRACAO = { comprimido: 'mg/comprimido', cápsula: 'mg/cápsula', mL: 'mg/mL', gota: 'mg/gota' }
const DECIMAIS = ['concentracao', 'doseMinCao', 'doseMaxCao', 'doseMinGato', 'doseMaxGato', 'doseMaximaMg']

const texto = (v) => (v == null ? '' : formatNumber(v, 3).replace(/\./g, ''))

function faixa(min, max) {
  if (min == null && max == null) return '—'
  if (min != null && max != null && min === max) return `${formatNumber(min, 3)} mg/kg`
  if (min != null && max != null) return `${formatNumber(min, 3)}–${formatNumber(max, 3)} mg/kg`
  return min != null ? `mín. ${formatNumber(min, 3)} mg/kg` : `máx. ${formatNumber(max, 3)} mg/kg`
}

export function CatalogoMedicamentos() {
  const toast = useToast()
  const { data, loading, error, reload, patchLocal } = useCollections(['medicamentos'])
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const estoque = useEstoque(CATEGORIA.medicamento)
  const [filtro, setFiltro] = useState('todos')
  const [movimento, setMovimento] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const testeFiltro = FILTROS_ESTOQUE.find((f) => f.id === filtro).test
  const aberto = detalhe ? data?.medicamentos.find((m) => m.id === detalhe) : null

  const excluir = async () => {
    setOcupado(true)
    try {
      await dataService.remove('medicamentos', excluindo.id)
      patchLocal('medicamentos', excluindo, 'remove')
      toast.success(`${excluindo.nome} saiu do catálogo.`)
      setExcluindo(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Page title="Catálogo de medicamentos" tabs={CALCULADORAS_TABS} width="largo">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <ResumoEstoque itens={estoque.itens} filtro={filtro} onFiltro={setFiltro} />
          {estoque.erro && <p className={styles.itemApoio}>Estoque indisponível: {estoque.erro}</p>}
          <div className={styles.barra}>
            <strong>
              {data.medicamentos.length} {data.medicamentos.length === 1 ? 'medicamento' : 'medicamentos'}
            </strong>
            <PillButton onClick={() => setEditando({})}>
              <PlusIcon size={16} strokeWidth={2.4} />
              Cadastrar medicamento
            </PillButton>
          </div>

          {data.medicamentos.length === 0 ? (
            <EmptyState title="Nenhum medicamento cadastrado">
              Cadastre as apresentações usadas na clínica para calcular doses mais rápido.
            </EmptyState>
          ) : (
            <div className={styles.listaFotos}>
              {data.medicamentos
                .filter((m) => filtro === 'todos' || testeFiltro(estoque.itens?.[m.id]))
                .map((m) => (
                  <CartaoCatalogo
                    key={m.id}
                    ilustracao={<CaixaRemedio medicamento={m} />}
                    etiquetas={[m.forma]}
                    titulo={m.nome}
                    estoque={estoque.itens?.[m.id]}
                    onDetalhes={() => setDetalhe(m.id)}
                  />
                ))}
              <button type="button" className={styles.cartaoNovo} onClick={() => setEditando({})}>
                <PlusIcon size={28} strokeWidth={2.2} />
                Cadastrar medicamento
              </button>
            </div>
          )}
        </>
      )}

      {aberto && (
        <Dialog
          open
          onClose={() => setDetalhe(null)}
          title={aberto.nome}
          description={[
            aberto.forma,
            `${formatNumber(aberto.concentracao, 3)} ${CONCENTRACAO[aberto.unidade]}`,
            aberto.via,
          ].join(' · ')}
          footer={
            <>
              <PillButton
                variant="contorno"
                onClick={() => {
                  setDetalhe(null)
                  setExcluindo(aberto)
                }}
              >
                Excluir
              </PillButton>
              <PillButton
                onClick={() => {
                  setDetalhe(null)
                  setEditando(aberto)
                }}
              >
                Editar
              </PillButton>
            </>
          }
        >
          <div className={styles.detalhes}>
            <div className={styles.doses}>
              <div>
                <span>Dose para cães</span>
                <strong>{faixa(aberto.doseMinCao, aberto.doseMaxCao)}</strong>
              </div>
              <div>
                <span>Dose para gatos</span>
                <strong>{faixa(aberto.doseMinGato, aberto.doseMaxGato)}</strong>
              </div>
            </div>
            {(aberto.intervaloPadraoHoras || aberto.doseMaximaMg != null || aberto.unidade === 'comprimido') && (
              <p className={styles.itemApoio}>
                {[
                  aberto.intervaloPadraoHoras && intervaloCurto(aberto.intervaloPadraoHoras),
                  aberto.doseMaximaMg != null && `máx. ${formatNumber(aberto.doseMaximaMg, 3)} mg/dose`,
                  aberto.unidade === 'comprimido' && (aberto.fracionavel ? 'pode partir' : 'não partir'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {aberto.principioAtivo && <p className={styles.notas}>Princípio ativo: {aberto.principioAtivo}</p>}
            {aberto.observacoes && <p className={styles.notas}>{aberto.observacoes}</p>}
            <PainelEstoque
              item={estoque.itens?.[aberto.id]}
              onAcao={(acao, item) => setMovimento({ acao, itemId: item.itemId, nome: aberto.nome })}
            />
          </div>
        </Dialog>
      )}

      {editando && (
        <MedicamentoDialog
          medicamento={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={(salvo) => {
            estoque.recarregar()
            patchLocal('medicamentos', salvo)
            setEditando(null)
          }}
        />
      )}

      {movimento &&
        estoque.itens?.[movimento.itemId] &&
        (movimento.acao === 'historico' ? (
          <HistoricoDialog
            item={estoque.itens[movimento.itemId]}
            nome={movimento.nome}
            onClose={() => setMovimento(null)}
            onSaved={estoque.atualizar}
          />
        ) : (
          <MovimentoDialog
            acao={movimento.acao}
            item={estoque.itens[movimento.itemId]}
            nome={movimento.nome}
            onClose={() => setMovimento(null)}
            onSaved={(salvo) => {
              estoque.atualizar(salvo)
              setMovimento(null)
            }}
          />
        ))}

      <ConfirmDialog
        open={Boolean(excluindo)}
        onClose={() => setExcluindo(null)}
        onConfirm={excluir}
        loading={ocupado}
        title={`Excluir ${excluindo?.nome ?? ''}?`}
        message="As prescrições já salvas continuam na ficha dos pacientes. O estoque deste medicamento também sai."
        confirmLabel="Excluir medicamento"
      />
    </Page>
  )
}

function MedicamentoDialog({ medicamento, onClose, onSaved }) {
  const toast = useToast()
  const formId = useId()
  const [values, setValues] = useState(() => ({
    nome: medicamento?.nome ?? '',
    principioAtivo: medicamento?.principioAtivo ?? '',
    forma: medicamento?.forma ?? 'Comprimido',
    concentracao: texto(medicamento?.concentracao),
    fracionavel: medicamento?.fracionavel ?? true,
    via: medicamento?.via ?? 'Oral',
    doseMinCao: texto(medicamento?.doseMinCao),
    doseMaxCao: texto(medicamento?.doseMaxCao),
    doseMinGato: texto(medicamento?.doseMinGato),
    doseMaxGato: texto(medicamento?.doseMaxGato),
    doseMaximaMg: texto(medicamento?.doseMaximaMg),
    intervaloPadraoHoras: medicamento?.intervaloPadraoHoras ? String(medicamento.intervaloPadraoHoras) : '',
    observacoes: medicamento?.observacoes ?? '',
    fonte: medicamento?.fonte ?? '',
  }))
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const set = (campo) => (e) => {
    const valor = DECIMAIS.includes(campo) ? maskDecimal(e.target.value, 9) : e.target.value
    setValues((prev) => ({ ...prev, [campo]: valor }))
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: '' }))
  }

  const salvar = async (event) => {
    event.preventDefault()
    const n = Object.fromEntries(DECIMAIS.map((c) => [c, parseDecimal(values[c])]))
    const proximos = {
      nome: values.nome.trim() ? '' : 'Informe o nome comercial.',
      concentracao: n.concentracao > 0 ? '' : 'Informe a concentração.',
      doseMaxCao:
        n.doseMinCao != null && n.doseMaxCao != null && n.doseMinCao > n.doseMaxCao ? 'A mínima passa da máxima.' : '',
      doseMaxGato:
        n.doseMinGato != null && n.doseMaxGato != null && n.doseMinGato > n.doseMaxGato
          ? 'A mínima passa da máxima.'
          : '',
    }
    setErros(proximos)
    if (Object.values(proximos).some(Boolean)) return

    setSalvando(true)
    try {
      const payload = {
        ...values,
        ...n,
        nome: values.nome.trim(),
        principioAtivo: values.principioAtivo.trim(),
        fracionavel: values.forma === 'Comprimido' && values.fracionavel,
        intervaloPadraoHoras: values.intervaloPadraoHoras ? Number(values.intervaloPadraoHoras) : null,
        observacoes: values.observacoes.trim(),
        fonte: values.fonte.trim(),
      }
      const salvo = medicamento
        ? await dataService.update('medicamentos', medicamento.id, payload)
        : await dataService.create('medicamentos', payload)
      toast.success(medicamento ? 'Medicamento atualizado!' : `${salvo.nome} entrou no catálogo!`)
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
      title={medicamento ? 'Editar medicamento' : 'Cadastrar medicamento'}
      description="Use os dados da bula do produto."
      size="lg"
      footer={
        <>
          <PillButton variant="contorno" onClick={onClose} disabled={salvando}>
            Cancelar
          </PillButton>
          <PillButton type="submit" form={formId} loading={salvando}>
            Salvar
          </PillButton>
        </>
      }
    >
      <form id={formId} onSubmit={salvar} noValidate>
        <FieldGrid>
          <Field
            label="Nome comercial"
            required
            maxLength={80}
            value={values.nome}
            onChange={set('nome')}
            error={erros.nome}
          />
          <Field
            label="Princípio ativo"
            maxLength={80}
            value={values.principioAtivo}
            onChange={set('principioAtivo')}
          />
          <Field
            label="Forma farmacêutica"
            as="select"
            options={FORMAS.map((v) => ({ value: v, label: v }))}
            value={values.forma}
            onChange={set('forma')}
          />
          <Field
            label={`Concentração (${UNIDADE_DA_FORMA[values.forma]})`}
            required
            inputMode="decimal"
            value={values.concentracao}
            onChange={set('concentracao')}
            error={erros.concentracao}
            hint={values.forma === 'Gotas' ? 'Ex.: 500 mg/mL com 20 gotas/mL = 25 mg por gota.' : undefined}
          />
          <Field
            label="Via"
            as="select"
            options={VIAS.map((v) => ({ value: v, label: v }))}
            value={values.via}
            onChange={set('via')}
          />
          <Field
            label="Intervalo padrão"
            as="select"
            options={[
              { value: '', label: 'Sem padrão' },
              ...INTERVALOS.map((h) => ({ value: String(h), label: intervaloLabel(h) })),
            ]}
            value={values.intervaloPadraoHoras}
            onChange={set('intervaloPadraoHoras')}
          />
          <Field
            label="Dose mínima para cães (mg/kg)"
            inputMode="decimal"
            value={values.doseMinCao}
            onChange={set('doseMinCao')}
            error={erros.doseMinCao}
          />
          <Field
            label="Dose máxima para cães (mg/kg)"
            inputMode="decimal"
            value={values.doseMaxCao}
            onChange={set('doseMaxCao')}
            error={erros.doseMaxCao}
          />
          <Field
            label="Dose mínima para gatos (mg/kg)"
            inputMode="decimal"
            value={values.doseMinGato}
            onChange={set('doseMinGato')}
            error={erros.doseMinGato}
          />
          <Field
            label="Dose máxima para gatos (mg/kg)"
            inputMode="decimal"
            value={values.doseMaxGato}
            onChange={set('doseMaxGato')}
            error={erros.doseMaxGato}
          />
          <Field
            label="Teto por dose (mg)"
            inputMode="decimal"
            hint="Opcional: limite absoluto, qualquer que seja o peso."
            value={values.doseMaximaMg}
            onChange={set('doseMaximaMg')}
            error={erros.doseMaximaMg}
          />
          <Field
            label="Observações"
            as="textarea"
            span={2}
            maxLength={500}
            value={values.observacoes}
            onChange={set('observacoes')}
          />
        </FieldGrid>
        {values.forma === 'Comprimido' && (
          <div className={styles.checks}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={values.fracionavel}
                onChange={(e) => setValues((prev) => ({ ...prev, fracionavel: e.target.checked }))}
              />
              <span>
                Comprimido sulcado (pode ser partido em até 1/4)
                <small>Sem sulco, a calculadora arredonda para o comprimido inteiro.</small>
              </span>
            </label>
          </div>
        )}
      </form>
    </Dialog>
  )
}
