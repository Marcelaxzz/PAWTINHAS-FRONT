import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimalForm } from '../AnimalForm/AnimalForm.jsx'
import { ConfirmDialog } from '../../../components/ui/Dialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import {
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
} from '../../../components/Icons/Icons.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { Page } from '../../../layouts/Page/Page.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { relatoriosService } from '../../../services/gestaoService.js'
import { photoSrc } from '../../../utils/images.js'
import { sexoEspecie } from '../../../utils/adocao.js'
import { normalize } from '../../../utils/text.js'
import logoContorno from '../../../assets/images/logo-pawtinhas-contorno.webp'
import styles from './AdminAdocoes.module.css'
import { soltarConfete } from '../../../utils/confete.js'

const STATUS_FILTRO = ['Todos', 'Disponível', 'Em processo', 'Adotado']

export function AdminAdocoes() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, loading, error, reload, patchLocal } = useCollections(['animais'])
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('Todos')
  const [filterOpen, setFilterOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const filterRef = useRef(null)
  const [baixando, setBaixando] = useState(false)

  const baixarRelatorio = async () => {
    setBaixando(true)
    try {
      await relatoriosService.pdfAdocao()
      toast.success('Relatório de adoção baixado.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBaixando(false)
    }
  }

  useEffect(() => {
    if (!filterOpen) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !filterRef.current?.contains(event.target))
        setFilterOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [filterOpen])

  const animais = useMemo(() => data?.animais ?? [], [data])
  const editing = editId ? animais.find((a) => a.id === editId) : null

  const stats = [
    { label: 'Total de animais', value: animais.length, tone: 'cafe' },
    {
      label: 'Disponíveis',
      value: animais.filter((a) => a.status === 'Disponível').length,
      tone: 'verde',
    },
    {
      label: 'Em processo',
      value: animais.filter((a) => a.status === 'Em processo').length,
      tone: 'ambar',
    },
    {
      label: 'Adotados',
      value: animais.filter((a) => a.status === 'Adotado').length,
      tone: 'vermelho',
    },
  ]

  const lista = animais.filter((a) => {
    const termo = normalize(busca)
    return (!termo || normalize(a.nome).includes(termo)) && (statusFiltro === 'Todos' || a.status === statusFiltro)
  })

  const salvarEdicao = async (payload) => {
    setBusy(true)
    try {
      const updated = await dataService.update('animais', editing.id, payload)
      patchLocal('animais', updated)
      if (updated.status === 'Adotado' && editing.status !== 'Adotado') {
        soltarConfete()
        toast.success(`${updated.nome} encontrou um lar! 🎉`)
      } else {
        toast.success(`${updated.nome} foi atualizado(a)!`)
      }
      navigate('/admin/adocoes', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const excluir = async () => {
    setBusy(true)
    try {
      await dataService.remove('animais', deleting.id)
      patchLocal('animais', deleting, 'remove')
      toast.success(`${deleting.nome} foi removido(a) do catálogo.`)
      setDeleting(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page
      title="Animais para adoção"
      subtitle="Cadastre, edite e acompanhe os animais disponíveis para adoção."
      actions={
        <>
          <PillButton to="/admin/adocoes/novo" size="lg">
            <PlusIcon size={18} strokeWidth={2.4} />
            Novo animal
          </PillButton>
          <PillButton variant="contorno" size="lg" onClick={baixarRelatorio} loading={baixando}>
            <DownloadIcon size={18} />
            Relatório em PDF
          </PillButton>
        </>
      }
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <dl className={styles.stats}>
            {stats.map((s) => (
              <div key={s.label} className={styles.stat}>
                <dt>{s.label}</dt>
                <dd className={styles[s.tone]}>{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className={styles.barra}>
            <h2 className={styles.secao}>Animais cadastrados</h2>
            <div className={styles.ferramentas}>
              <label className={styles.busca}>
                <SearchIcon size={16} />
                <span className="visualmente-oculto">Buscar por nome</span>
                <input
                  type="search"
                  placeholder="Buscar por nome..."
                  maxLength={60}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </label>
              <div className={styles.filtroEnvolve} ref={filterRef}>
                <button
                  type="button"
                  className={`${styles.filtrar} ${statusFiltro !== 'Todos' ? styles.filtrarAtivo : ''}`}
                  aria-expanded={filterOpen}
                  aria-controls="filtro-status"
                  onClick={() => setFilterOpen((v) => !v)}
                >
                  <SlidersIcon size={16} />
                  Filtrar
                  {statusFiltro !== 'Todos' && <span className={styles.filtroValor}>: {statusFiltro}</span>}
                </button>
                {filterOpen && (
                  <fieldset id="filtro-status" className={styles.filtroPainel}>
                    <legend>Status</legend>
                    {STATUS_FILTRO.map((s) => (
                      <label key={s}>
                        <input
                          type="radio"
                          name="status"
                          value={s}
                          checked={statusFiltro === s}
                          onChange={() => {
                            setStatusFiltro(s)
                            setFilterOpen(false)
                          }}
                        />
                        {s}
                      </label>
                    ))}
                  </fieldset>
                )}
              </div>
            </div>
          </div>

          {lista.length === 0 ? (
            <EmptyState title={animais.length ? 'Nenhum animal encontrado' : 'Nenhum animal cadastrado'}>
              {animais.length ? 'Tente outro nome ou limpe o filtro.' : 'Cadastre o primeiro animal para adoção.'}
            </EmptyState>
          ) : (
            <div className={styles.grade}>
              {lista.map((animal) => (
                <article key={animal.id} className={styles.card}>
                  <div className={styles.foto}>
                    {photoSrc(animal.foto) && (
                      <img src={photoSrc(animal.foto)} alt={`Foto de ${animal.nome}`} loading="lazy" />
                    )}
                    <span className={`${styles.status} ${animal.status === 'Adotado' ? styles.statusAdotado : ''}`}>
                      {animal.status}
                    </span>
                    <span className={styles.selo}>{sexoEspecie(animal)}</span>
                  </div>
                  <div className={styles.corpo}>
                    <div className={styles.nomeLinha}>
                      <h3>{animal.nome}</h3>
                      <span>{animal.idade}</span>
                    </div>
                    <p className={styles.raca}>
                      {animal.raca || animal.especie} • Porte {animal.porte}
                    </p>
                    <div className={styles.acoes}>
                      <Link to={`/adocao/${animal.id}`} className={styles.acao}>
                        <EyeIcon size={15} />
                        Ver
                      </Link>
                      <Link to={`/admin/adocoes/${animal.id}/editar`} className={styles.acao}>
                        <PencilIcon size={15} />
                        Editar
                      </Link>
                      <button
                        type="button"
                        className={`${styles.acao} ${styles.acaoExcluir}`}
                        onClick={() => setDeleting(animal)}
                      >
                        <TrashIcon size={15} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {editId && data && (
        <EditarAnimalModal
          animal={editing}
          saving={busy}
          onSave={salvarEdicao}
          onClose={() => navigate('/admin/adocoes', { replace: true })}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={excluir}
        loading={busy}
        title={`Excluir ${deleting?.nome ?? ''}?`}
        message="O animal sai do catálogo de adoção e da lista de favoritos dos visitantes."
        confirmLabel="Excluir animal"
      />
    </Page>
  )
}

function EditarAnimalModal({ animal, onClose, onSave, saving }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    const cancel = (event) => {
      event.preventDefault()
      onClose()
    }
    dialog?.addEventListener('cancel', cancel)
    return () => dialog?.removeEventListener('cancel', cancel)
  }, [onClose])

  return (
    <dialog ref={ref} className={styles.modal} aria-labelledby="titulo-editar">
      <header className={styles.modalTopo}>
        <img src={logoContorno} alt="" className={styles.modalLogo} width="90" height="118" />
        <div className={styles.modalTextos}>
          <div className={styles.modalTituloLinha}>
            <h2 id="titulo-editar">Editar animal</h2>
            {animal && <span className={styles.modalId}>ID #{animal.id.slice(-6).toUpperCase()}</span>}
          </div>
          <p>Altere o que mudou e salve.</p>
        </div>
        <button type="button" className={styles.modalFechar} onClick={onClose} aria-label="Fechar">
          <CloseIcon size={22} />
        </button>
      </header>
      <div className={styles.modalCorpo}>
        {animal ? (
          <AnimalForm
            animal={animal}
            variant="modal"
            onSubmit={onSave}
            onCancel={onClose}
            saving={saving}
            submitLabel="Salvar alterações"
          />
        ) : (
          <EmptyState title="Animal não encontrado">Ele pode ter sido excluído.</EmptyState>
        )}
      </div>
    </dialog>
  )
}
