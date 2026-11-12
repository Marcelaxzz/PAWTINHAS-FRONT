import { useId, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { PlusIcon } from '../../../components/Icons/Icons.jsx'
import { PhotoPicker } from '../../../components/PhotoPicker/PhotoPicker.jsx'
import { photoSrc } from '../../../utils/images.js'
import { useCollections } from '../../../hooks/useCollections.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { formatNumber, maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { CALCULADORAS_TABS } from '../calculadorasTabs.js'
import { CATEGORIA } from '../../../services/gestaoService.js'
import { CartaoCatalogo } from './CartaoCatalogo.jsx'
import { fotoDaRacao } from './fotosCatalogo.js'
import { DetalhesItem, HistoricoDialog, MovimentoDialog, ResumoEstoque } from './Estoque.jsx'
import { FILTROS_ESTOQUE, useEstoque } from './estoque.js'
import styles from '../Calculadoras.module.css'

const opts = (lista) => lista.map((v) => ({ value: v, label: v }))

export function CatalogoRacoes() {
  const toast = useToast()
  const { data, loading, error, reload, patchLocal } = useCollections(['racoes'])
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const estoque = useEstoque(CATEGORIA.racao)
  const [filtro, setFiltro] = useState('todos')
  const [movimento, setMovimento] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const aberto = detalhe ? data?.racoes.find((i) => i.id === detalhe) : null
  const testeFiltro = FILTROS_ESTOQUE.find((f) => f.id === filtro).test

  const excluir = async () => {
    setOcupado(true)
    try {
      await dataService.remove('racoes', excluindo.id)
      patchLocal('racoes', excluindo, 'remove')
      toast.success(`${excluindo.nome} saiu do catálogo.`)
      setExcluindo(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Page title="Catálogo de rações" tabs={CALCULADORAS_TABS} width="largo">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <ResumoEstoque itens={estoque.itens} filtro={filtro} onFiltro={setFiltro} />
          {estoque.erro && <p className={styles.itemApoio}>Estoque indisponível: {estoque.erro}</p>}
          <div className={styles.barra}>
            <strong>
              {data.racoes.length} {data.racoes.length === 1 ? 'ração' : 'rações'}
            </strong>
            <PillButton onClick={() => setEditando({})}>
              <PlusIcon size={16} strokeWidth={2.4} />
              Cadastrar ração
            </PillButton>
          </div>

          {data.racoes.length === 0 ? (
            <EmptyState title="Nenhuma ração cadastrada">Cadastre as rações indicadas pela clínica.</EmptyState>
          ) : (
            <div className={styles.listaFotos}>
              {data.racoes
                .filter((r) => filtro === 'todos' || testeFiltro(estoque.itens?.[r.id]))
                .map((r) => (
                  <CartaoCatalogo
                    key={r.id}
                    foto={fotoDaRacao(r)}
                    etiquetas={[
                      r.especie === 'Gato' ? 'Gatos' : 'Cães',
                      r.tipo,
                      r.fase === 'Todas' ? 'Todas as fases' : r.fase,
                    ]}
                    titulo={r.nome}
                    destaque={{ valor: formatNumber(r.kcalPorKg, 0), unidade: 'kcal por kg' }}
                    estoque={estoque.itens?.[r.id]}
                    onDetalhes={() => setDetalhe(r.id)}
                  />
                ))}
              <button type="button" className={styles.cartaoNovo} onClick={() => setEditando({})}>
                <PlusIcon size={28} strokeWidth={2.2} />
                Cadastrar ração
              </button>
            </div>
          )}
        </>
      )}

      {aberto && (
        <DetalhesItem
          titulo={aberto.nome}
          descricao={[aberto.tipo, aberto.especie === 'Gato' ? 'Gatos' : 'Cães'].join(' · ')}
          estoque={estoque.itens?.[aberto.id]}
          onAcao={(acao, item) => setMovimento({ acao, itemId: item.itemId, nome: aberto.nome })}
          onEditar={() => {
            setDetalhe(null)
            setEditando(aberto)
          }}
          onExcluir={() => {
            setDetalhe(null)
            setExcluindo(aberto)
          }}
          onClose={() => setDetalhe(null)}
        >
          <div className={styles.doses}>
            <div>
              <span>Energia</span>
              <strong>{formatNumber(aberto.kcalPorKg, 1)} kcal/kg</strong>
            </div>
            <div>
              <span>Fase</span>
              <strong>{aberto.fase === 'Todas' ? 'Todas as fases' : aberto.fase}</strong>
            </div>
          </div>
          {aberto.observacoes && <p className={styles.itemApoio}>{aberto.observacoes}</p>}
        </DetalhesItem>
      )}

      {editando && (
        <RacaoDialog
          racao={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={(salva) => {
            estoque.recarregar()
            patchLocal('racoes', salva)
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
        message="Os planos alimentares já salvos continuam na ficha dos pacientes. O estoque desta ração também sai."
        confirmLabel="Excluir ração"
      />
    </Page>
  )
}

function RacaoDialog({ racao, onClose, onSaved }) {
  const toast = useToast()
  const formId = useId()
  const [values, setValues] = useState(() => ({
    nome: racao?.nome ?? '',
    especie: racao?.especie ?? 'Cachorro',
    fase: racao?.fase ?? 'Adulto',
    tipo: racao?.tipo ?? 'Seca',
    kcalPorKg: racao ? formatNumber(racao.kcalPorKg, 1).replace(/\./g, '') : '',
    observacoes: racao?.observacoes ?? '',
    foto: racao?.foto ?? '',
  }))
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const set = (campo) => (e) => {
    const valor = campo === 'kcalPorKg' ? maskDecimal(e.target.value, 7) : e.target.value
    setValues((prev) => ({ ...prev, [campo]: valor }))
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: '' }))
  }

  const salvar = async (event) => {
    event.preventDefault()
    const kcal = parseDecimal(values.kcalPorKg)
    const proximos = {
      nome: values.nome.trim() ? '' : 'Informe o nome da ração.',
      kcalPorKg: kcal >= 300 && kcal <= 6000 ? '' : 'Informe entre 300 e 6.000 kcal/kg.',
    }
    setErros(proximos)
    if (Object.values(proximos).some(Boolean)) return

    setSalvando(true)
    try {
      const payload = { ...values, nome: values.nome.trim(), kcalPorKg: kcal, observacoes: values.observacoes.trim() }
      const salva = racao
        ? await dataService.update('racoes', racao.id, payload)
        : await dataService.create('racoes', payload)
      toast.success(racao ? 'Ração atualizada!' : `${salva.nome} entrou no catálogo!`)
      onSaved(salva)
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
      title={racao ? 'Editar ração' : 'Cadastrar ração'}
      size="md"
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
        <div className={styles.fotoCampo}>
          <PhotoPicker
            value={photoSrc(values.foto)}
            onChange={(foto) => setValues((prev) => ({ ...prev, foto }))}
            label="Enviar foto do pacote"
          />
        </div>
        <FieldGrid>
          <Field
            label="Nome"
            required
            span={2}
            maxLength={80}
            value={values.nome}
            onChange={set('nome')}
            error={erros.nome}
          />
          <Field
            label="Energia metabolizável (kcal/kg)"
            required
            inputMode="decimal"
            placeholder="Ex.: 3800"
            value={values.kcalPorKg}
            onChange={set('kcalPorKg')}
            error={erros.kcalPorKg}
          />
          <Field
            label="Tipo"
            as="select"
            options={opts(['Seca', 'Úmida', 'Terapêutica'])}
            value={values.tipo}
            onChange={set('tipo')}
          />
          <Field
            label="Espécie"
            as="select"
            options={[
              { value: 'Cachorro', label: 'Cães' },
              { value: 'Gato', label: 'Gatos' },
            ]}
            value={values.especie}
            onChange={set('especie')}
          />
          <Field
            label="Fase"
            as="select"
            options={[
              { value: 'Filhote', label: 'Filhote' },
              { value: 'Adulto', label: 'Adulto' },
              { value: 'Idoso', label: 'Idoso (sênior)' },
              { value: 'Todas', label: 'Todas as fases' },
            ]}
            value={values.fase}
            onChange={set('fase')}
          />
          <Field
            label="Observações"
            as="textarea"
            span={2}
            maxLength={300}
            value={values.observacoes}
            onChange={set('observacoes')}
          />
        </FieldGrid>
      </form>
    </Dialog>
  )
}
