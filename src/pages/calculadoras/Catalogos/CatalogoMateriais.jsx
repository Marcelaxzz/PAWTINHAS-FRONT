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
import { CALCULADORAS_TABS } from '../calculadorasTabs.js'
import { CATEGORIA } from '../../../services/gestaoService.js'
import { CartaoCatalogo } from './CartaoCatalogo.jsx'
import { fotoDoMaterial } from './fotosCatalogo.js'
import { DetalhesItem, HistoricoDialog, MovimentoDialog, ResumoEstoque } from './Estoque.jsx'
import { FILTROS_ESTOQUE, TIPOS_MATERIAL, UNIDADES_MATERIAL, useEstoque } from './estoque.js'
import styles from '../Calculadoras.module.css'

const opts = (lista) => lista.map((v) => ({ value: v, label: v }))

export function CatalogoMateriais() {
  const toast = useToast()
  const { data, loading, error, reload, patchLocal } = useCollections(['materiais'])
  const [editando, setEditando] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const estoque = useEstoque(CATEGORIA.material)
  const [filtro, setFiltro] = useState('todos')
  const [tipo, setTipo] = useState('')
  const [movimento, setMovimento] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const aberto = detalhe ? data?.materiais.find((i) => i.id === detalhe) : null
  const testeFiltro = FILTROS_ESTOQUE.find((f) => f.id === filtro).test

  const excluir = async () => {
    setOcupado(true)
    try {
      await dataService.remove('materiais', excluindo.id)
      patchLocal('materiais', excluindo, 'remove')
      toast.success(`${excluindo.nome} saiu do catálogo.`)
      setExcluindo(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOcupado(false)
    }
  }

  const visiveis = (data?.materiais ?? [])
    .filter((m) => !tipo || m.tipo === tipo)
    .filter((m) => filtro === 'todos' || testeFiltro(estoque.itens?.[m.id]))

  return (
    <Page title="Materiais e insumos" tabs={CALCULADORAS_TABS} width="largo">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <ResumoEstoque itens={estoque.itens} filtro={filtro} onFiltro={setFiltro} />
          {estoque.erro && <p className={styles.itemApoio}>Estoque indisponível: {estoque.erro}</p>}
          <div className={styles.barra}>
            <div className={styles.filtrosTipo} role="group" aria-label="Filtrar por tipo">
              {['', ...TIPOS_MATERIAL].map((t) => (
                <button key={t || 'todos'} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}>
                  {t || 'Todos'}
                  <small>{t ? data.materiais.filter((m) => m.tipo === t).length : data.materiais.length}</small>
                </button>
              ))}
            </div>
            <PillButton onClick={() => setEditando({})}>
              <PlusIcon size={16} strokeWidth={2.4} />
              Cadastrar material
            </PillButton>
          </div>

          {data.materiais.length === 0 ? (
            <EmptyState title="Nenhum material cadastrado">
              Cadastre gazes, ataduras, soro, fios e instrumental para acompanhar o estoque.
            </EmptyState>
          ) : visiveis.length === 0 ? (
            <EmptyState title="Nada neste filtro">Troque o tipo ou a situação do estoque.</EmptyState>
          ) : (
            <div className={styles.listaFotos}>
              {visiveis.map((m) => (
                <CartaoCatalogo
                  key={m.id}
                  foto={fotoDoMaterial(m)}
                  ajuste="preenche"
                  etiquetas={[m.tipo]}
                  titulo={m.nome}
                  apoio={m.especificacao || undefined}
                  estoque={estoque.itens?.[m.id]}
                  onDetalhes={() => setDetalhe(m.id)}
                />
              ))}
              <button type="button" className={styles.cartaoNovo} onClick={() => setEditando({})}>
                <PlusIcon size={28} strokeWidth={2.2} />
                Cadastrar material
              </button>
            </div>
          )}
        </>
      )}

      {aberto && (
        <DetalhesItem
          titulo={aberto.nome}
          descricao={[aberto.tipo, aberto.especificacao].filter(Boolean).join(' · ')}
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
          {aberto.especificacao && <p className={styles.itemApoio}>{aberto.especificacao}</p>}
          {aberto.observacoes && <p className={styles.itemApoio}>{aberto.observacoes}</p>}
        </DetalhesItem>
      )}

      {editando && (
        <MaterialDialog
          material={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={(salvo) => {
            estoque.recarregar()
            patchLocal('materiais', salvo)
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
        message="O estoque e o histórico deste material também saem."
        confirmLabel="Excluir material"
      />
    </Page>
  )
}

function MaterialDialog({ material, onClose, onSaved }) {
  const toast = useToast()
  const formId = useId()
  const [values, setValues] = useState(() => ({
    nome: material?.nome ?? '',
    tipo: material?.tipo ?? TIPOS_MATERIAL[0],
    unidade: material?.unidade ?? 'unidade',
    especificacao: material?.especificacao ?? '',
    observacoes: material?.observacoes ?? '',
  }))
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)

  const set = (campo) => (e) => {
    setValues((prev) => ({ ...prev, [campo]: e.target.value }))
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: '' }))
  }

  const salvar = async (event) => {
    event.preventDefault()
    if (!values.nome.trim()) return setErros({ nome: 'Informe o nome do material.' })

    setSalvando(true)
    try {
      const payload = {
        ...values,
        nome: values.nome.trim(),
        especificacao: values.especificacao.trim(),
        observacoes: values.observacoes.trim(),
      }
      const salvo = material
        ? await dataService.update('materiais', material.id, payload)
        : await dataService.create('materiais', payload)
      toast.success(material ? 'Material atualizado!' : `${salvo.nome} entrou no catálogo!`)
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
      title={material ? 'Editar material' : 'Cadastrar material'}
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
        <FieldGrid>
          <Field
            label="Nome"
            required
            span={2}
            maxLength={80}
            placeholder="Ex.: Gaze estéril"
            value={values.nome}
            onChange={set('nome')}
            error={erros.nome}
          />
          <Field label="Tipo" as="select" options={opts(TIPOS_MATERIAL)} value={values.tipo} onChange={set('tipo')} />
          <Field
            label="Contado em"
            as="select"
            options={opts(UNIDADES_MATERIAL)}
            value={values.unidade}
            onChange={set('unidade')}
            hint="A unidade usada nas entradas e saídas do estoque."
          />
          <Field
            label="Tamanho ou volume"
            span={2}
            maxLength={80}
            placeholder="Ex.: 7,5 x 7,5 cm, 500 mL, nº 7,5"
            value={values.especificacao}
            onChange={set('especificacao')}
            error={erros.especificacao}
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
