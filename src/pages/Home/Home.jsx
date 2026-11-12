import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  DownloadIcon,
  HeartIcon,
  PillIcon,
  PlusIcon,
  RulerIcon,
  StethoscopeIcon,
  UsersIcon,
} from '../../components/Icons/Icons.jsx'
import { StatusChip, Chip } from '../../components/ui/Chip.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useClinic } from '../../hooks/useClinic.js'
import { usePageTitle } from '../../hooks/usePageTitle.js'
import { useToast } from '../../hooks/useToast.js'
import { estoqueService, relatoriosService } from '../../services/gestaoService.js'
import { montarPainel, RECURSOS_PAINEL, saudacao, TOM_SERVICO } from '../../utils/painel.js'
import { SITUACOES, qtd } from '../calculadoras/Catalogos/estoque.js'
import pets from '../../assets/images/pets-inicio.webp'
import { photoSrc } from '../../utils/images.js'
import styles from './Home.module.css'

const ICONES = { agenda: CalendarIcon, emergencias: AlertIcon, pacientes: UsersIcon, estoque: PillIcon }

const ATALHOS = [
  { to: '/agenda/consultas/nova', rotulo: 'Nova consulta', icone: StethoscopeIcon },
  { to: '/pacientes/novo', rotulo: 'Novo paciente', icone: PlusIcon },
  { to: '/protese-3d', rotulo: 'Medir prótese', icone: RulerIcon },
  { to: '/calculadoras/dose', rotulo: 'Calcular dose', icone: PillIcon },
]

const inicioDoMes = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('sv-SE')
}

export function Home() {
  usePageTitle('Início')
  const { user } = useAuth()
  const toast = useToast()
  const { data, lookup, error, reload } = useClinic(RECURSOS_PAINEL)
  const [estoque, setEstoque] = useState(null)
  const [baixando, setBaixando] = useState('')
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? ''
  const agora = new Date()

  useEffect(() => {
    let ativo = true
    estoqueService
      .listar()
      .then((lista) => ativo && setEstoque(lista))
      .catch(() => ativo && setEstoque([]))
    return () => {
      ativo = false
    }
  }, [])

  const painel = useMemo(() => (data ? montarPainel(data, lookup, estoque) : null), [data, lookup, estoque])

  const relatorios = [
    { id: 'agenda', rotulo: 'Agenda do mês', baixar: () => relatoriosService.pdfAgenda({ de: inicioDoMes() }) },
    { id: 'estoque', rotulo: 'Estoque', baixar: () => relatoriosService.pdfEstoque() },
    { id: 'alarmes', rotulo: 'Alarmes', baixar: () => relatoriosService.pdfAlarmes() },
    { id: 'adocao', rotulo: 'Adoção', baixar: () => relatoriosService.pdfAdocao() },
  ]
  const baixar = async (r) => {
    setBaixando(r.id)
    try {
      await r.baixar()
      toast.success(`Relatório de ${r.rotulo.toLowerCase()} baixado.`)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBaixando('')
    }
  }

  return (
    <main className={styles.painel}>
      <div className={styles.conteudo}>
        {/* ---------- Boas-vindas ---------- */}
        <section className={styles.hero}>
          <div className={styles.heroTexto}>
            <p className={styles.data}>
              {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className={styles.titulo}>
              {saudacao(agora.getHours())}
              {firstName && `, ${firstName}`}!
            </h1>
            <p className={styles.resumoTexto}>
              {!painel ? (
                'Carregando o resumo da clínica…'
              ) : painel.proximo ? (
                <>
                  Próximo atendimento às <strong>{painel.proximo.hora}</strong>: {painel.proximo.tipo.toLowerCase()} de{' '}
                  <strong>{painel.proximo.pet}</strong>.
                </>
              ) : (
                'Nenhum atendimento pendente no restante do dia.'
              )}
            </p>
            <div className={styles.atalhos}>
              {ATALHOS.map(({ to, rotulo, icone: Icone }) => (
                <Link key={to} to={to} className={styles.atalho}>
                  <Icone size={18} />
                  {rotulo}
                </Link>
              ))}
            </div>
          </div>
          <img src={pets} alt="" className={styles.heroPets} width="998" height="561" />
        </section>

        {error && (
          <p className={styles.erro}>
            Não foi possível carregar os dados: {error}{' '}
            <button type="button" onClick={reload}>
              Tentar de novo
            </button>
          </p>
        )}

        {/* ---------- Indicadores ---------- */}
        {painel && (
          <section className={styles.indicadores} aria-label="Indicadores">
            {painel.indicadores.map((ind) => {
              const Icone = ICONES[ind.id]
              return (
                <Link key={ind.id} to={ind.to} className={`${styles.indicador} ${styles[ind.tom]}`}>
                  <span className={styles.indicadorIcone}>
                    <Icone size={24} />
                  </span>
                  <strong>{ind.valor}</strong>
                  <span className={styles.indicadorRotulo}>{ind.rotulo}</span>
                  <span className={styles.indicadorApoio}>{ind.apoio}</span>
                </Link>
              )
            })}
          </section>
        )}

        {painel && (
          <div className={styles.grade}>
            <div className={styles.coluna}>
              {/* ---------- Agenda de hoje ---------- */}
              <section className={`${styles.cartao} ${styles.agenda}`} aria-labelledby="titulo-hoje">
                <header className={styles.cartaoTopo}>
                  <div>
                    <h2 id="titulo-hoje">Agenda de hoje</h2>
                    <p>{painel.linha.length ? `${painel.linha.length} atendimentos` : 'Dia livre'}</p>
                  </div>
                  <Link to="/agenda" className={styles.verTudo}>
                    Ver agenda
                    <ArrowRightIcon size={16} />
                  </Link>
                </header>
                {painel.linha.length === 0 ? (
                  <p className={styles.vazio}>Nenhum atendimento marcado para hoje.</p>
                ) : (
                  <ol className={styles.linha}>
                    {painel.linha.slice(0, 7).map((item) => (
                      <li key={`${item.tipo}-${item.id}`} className={styles[TOM_SERVICO[item.tipo] ?? 'ceu']}>
                        <span className={styles.hora}>
                          <ClockIcon size={14} />
                          {item.hora}
                        </span>
                        <span className={styles.linhaTexto}>
                          <strong>{item.pet}</strong>
                          <span>
                            {item.tipo} · {item.detalhe}
                          </span>
                        </span>
                        <StatusChip status={item.status} />
                      </li>
                    ))}
                  </ol>
                )}
                {painel.linha.length > 7 && (
                  <Link to="/agenda" className={styles.maisAgenda}>
                    Ver os outros {painel.linha.length - 7} atendimentos de hoje
                  </Link>
                )}
              </section>

              {/* ---------- Próximos 7 dias ---------- */}
              <section className={styles.cartao} aria-labelledby="titulo-semana">
                <header className={styles.cartaoTopo}>
                  <div>
                    <h2 id="titulo-semana">Próximos 7 dias</h2>
                    <p>Atendimentos marcados por dia</p>
                  </div>
                </header>
                <div className={styles.barras}>
                  {painel.semana.map((d) => (
                    <div key={d.iso} className={styles.barraDia}>
                      <span className={styles.barraValor}>{d.total}</span>
                      <span className={styles.barraTrilho}>
                        <span style={{ height: `${(d.total / painel.maxSemana) * 100}%` }} />
                      </span>
                      <span className={styles.barraRotulo}>
                        {d.rotulo}
                        <small>{d.dia}</small>
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ---------- Pacientes: mostra quantos couberem, a coluna fecha cheia ---------- */}
              <section className={`${styles.cartao} ${styles.cartaoPacientes}`} aria-labelledby="titulo-pacientes">
                <header className={styles.cartaoTopo}>
                  <div>
                    <h2 id="titulo-pacientes">Pacientes</h2>
                    <p>Os pawtinhas da clínica</p>
                  </div>
                  <Link to="/pacientes" className={styles.verTudo}>
                    Ver todos
                    <ArrowRightIcon size={16} />
                  </Link>
                </header>
                <ul className={styles.pets}>
                  {[...data.pets]
                    .sort((a, b) => Number(Boolean(photoSrc(b.foto))) - Number(Boolean(photoSrc(a.foto))))
                    .slice(0, 24)
                    .map((p) => (
                      <li key={p.id}>
                        <Link to={`/pacientes/${encodeURIComponent(p.id)}`} className={styles.pet}>
                          {photoSrc(p.foto) ? (
                            <img src={photoSrc(p.foto)} alt="" loading="lazy" />
                          ) : (
                            <span className={styles.petInicial}>{p.nome.slice(0, 1)}</span>
                          )}
                          <strong>{p.nome}</strong>
                          <small>{p.especie}</small>
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            </div>

            <div className={styles.coluna}>
              {/* ---------- Estoque ---------- */}
              <section className={styles.cartao} aria-labelledby="titulo-estoque">
                <header className={styles.cartaoTopo}>
                  <div>
                    <h2 id="titulo-estoque">Estoque</h2>
                    <p>Medicamentos, rações e materiais que pedem atenção</p>
                  </div>
                  <Link to="/calculadoras/medicamentos" className={styles.verTudo}>
                    Abrir
                    <ArrowRightIcon size={16} />
                  </Link>
                </header>
                {!estoque ? (
                  <p className={styles.vazio}>Carregando…</p>
                ) : painel.atencaoEstoque.length === 0 ? (
                  <p className={styles.vazio}>Tudo em dia no estoque.</p>
                ) : (
                  <ul className={styles.listaSimples}>
                    {painel.atencaoEstoque.slice(0, 5).map((i) => (
                      <li key={`${i.categoria}-${i.itemId}`}>
                        <div>
                          <strong>{i.nome}</strong>
                          <small>{qtd(i.saldo, i.unidade)}</small>
                        </div>
                        <Chip tone={SITUACOES[i.situacao]?.tom ?? 'neutro'} size="xs">
                          {SITUACOES[i.situacao]?.texto ?? i.situacao}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ---------- Alarmes ---------- */}
              <section className={styles.cartao} aria-labelledby="titulo-alarmes">
                <header className={styles.cartaoTopo}>
                  <div>
                    <h2 id="titulo-alarmes">Próximos alarmes</h2>
                    <p>
                      {painel.alarmesAtivos} {painel.alarmesAtivos === 1 ? 'ativo' : 'ativos'}
                    </p>
                  </div>
                  <Link to="/alarmes" className={styles.verTudo}>
                    Abrir
                    <ArrowRightIcon size={16} />
                  </Link>
                </header>
                {painel.proximosAlarmes.length === 0 ? (
                  <p className={styles.vazio}>Nenhum alarme ativo.</p>
                ) : (
                  <ul className={styles.listaSimples}>
                    {painel.proximosAlarmes.map((a) => (
                      <li key={a.id}>
                        <span className={styles.alarmeHora}>{a.hora}</span>
                        <div>
                          <strong>{a.nome}</strong>
                          <small>{[a.pet, a.dia].filter(Boolean).join(' · ')}</small>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ---------- Adoção + relatórios ---------- */}
              <section className={styles.cartao} aria-labelledby="titulo-relatorios">
                <header className={styles.cartaoTopo}>
                  <div>
                    <h2 id="titulo-relatorios">Relatórios em PDF</h2>
                    <p>Prontos para imprimir ou enviar</p>
                  </div>
                </header>
                <div className={styles.relatorios}>
                  {relatorios.map((r) => (
                    <button key={r.id} type="button" onClick={() => baixar(r)} disabled={baixando === r.id}>
                      <DownloadIcon size={16} />
                      {baixando === r.id ? 'Gerando…' : r.rotulo}
                    </button>
                  ))}
                </div>
                <Link to="/admin/adocoes" className={styles.adocao}>
                  <HeartIcon size={18} />
                  <span>
                    <strong>{painel.adocao.disponiveis}</strong> disponíveis para adoção ·{' '}
                    <strong>{painel.adocao.emProcesso}</strong> em processo
                  </span>
                  <ArrowRightIcon size={16} />
                </Link>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
