import { useMemo, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { PetCard } from '../../../components/ui/PetCard.jsx'
import { Chip, StatusChip } from '../../../components/ui/Chip.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { ReportDialog } from '../../../components/ui/RecordDialog.jsx'
import { Dialog } from '../../../components/ui/Dialog.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { ChipIcon, ClockIcon, InfoIcon } from '../../../components/Icons/Icons.jsx'
import { useClinic } from '../../../hooks/useClinic.js'
import { useRecordActions } from '../../../hooks/useRecordActions.js'
import { formatDateBr } from '../../../utils/dates.js'
import { EsquemaAlarme } from './EsquemaAlarme.jsx'
import { LIGACOES } from './ligacoesAlarme.js'
import lists from '../panelLists.module.css'
import styles from './Alarmes.module.css'
import { relatoriosService } from '../../../services/gestaoService.js'
import { proximoToque, resumoDoAlarme, textoDoToque } from '../../../utils/alarmes.js'
import { NesteNavegador } from '../../../components/AlarmesNoNavegador/NesteNavegador.jsx'
import { avisarAlarmesMudaram } from '../../../components/AlarmesNoNavegador/alarmesNoNavegador.js'

export function Alarmes() {
  const { data, loading, error, reload, lookup, patchLocal } = useClinic(['alarmes', 'historicoAlarmes'])
  const { update } = useRecordActions('alarmes', patchLocal)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const alternarAtivo = async (alarme) => {
    setTogglingId(alarme.id)
    try {
      await update(
        alarme.id,
        { ativo: !alarme.ativo },
        alarme.ativo ? `${alarme.nome} foi pausado.` : `${alarme.nome} foi ativado.`,
      )
      avisarAlarmesMudaram()
    } catch {
      // O aviso de erro já foi exibido.
    } finally {
      setTogglingId(null)
    }
  }

  const alarmes = useMemo(() => (data ? [...data.alarmes].sort((a, b) => a.hora.localeCompare(b.hora)) : []), [data])
  const ativos = alarmes.filter((a) => a.ativo).length
  const pausados = alarmes.length - ativos

  const petBadge = (petId) => lookup.pet(petId)?.nome

  return (
    <Page title="Alarmes" subtitle="Lembretes que tocam no ESP32, no app do celular e neste painel.">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <>
          <section className={styles.iot} aria-label="Dispositivo ESP32">
            <span className={styles.iotIcone} aria-hidden="true">
              <ChipIcon size={22} />
            </span>
            <div className={styles.iotTexto}>
              <strong>Alarmes no dispositivo ESP32</strong>
              <p>
                A caixinha confere os alarmes a cada 20 segundos e guarda tudo na memória: se a internet cair, ela
                continua tocando. Os pausados ficam guardados, mas não tocam.
              </p>
            </div>
            <div className={styles.iotAcoes}>
              <PillButton variant="contorno" size="lg" onClick={() => setDeviceOpen(true)}>
                Ver dispositivo
              </PillButton>
              <PillButton size="lg" to="/alarmes/novo">
                Novo alarme
              </PillButton>
            </div>
          </section>

          <NesteNavegador />

          {alarmes.length === 0 ? (
            <EmptyState title="Nenhum alarme configurado">
              Cadastre lembretes de medicação, vacinas e visitas.
            </EmptyState>
          ) : (
            <div className={lists.lista}>
              {alarmes.map((alarme) => (
                <PetCard
                  key={alarme.id}
                  avatar={80}
                  photo={lookup.photoOf(alarme)}
                  title={alarme.nome}
                  badges={
                    <>
                      {petBadge(alarme.petId) && <Chip size="sm">{petBadge(alarme.petId)}</Chip>}
                      <StatusChip status={alarme.ativo ? 'Ativo' : 'Pausado'} />
                    </>
                  }
                  actions={
                    <>
                      <span className={styles.hora}>
                        <ClockIcon size={17} strokeWidth={2.2} />
                        <span className="visualmente-oculto">Dispara às</span>
                        {alarme.hora}
                      </span>
                      <PillButton
                        variant="contorno"
                        size="lg"
                        onClick={() => alternarAtivo(alarme)}
                        loading={togglingId === alarme.id}
                        aria-label={`${alarme.ativo ? 'Pausar' : 'Ativar'} ${alarme.nome}`}
                      >
                        {alarme.ativo ? 'Pausar' : 'Ativar'}
                      </PillButton>
                      <PillButton variant="contorno" size="lg" to={`/alarmes/${alarme.id}/editar`}>
                        Editar
                      </PillButton>
                    </>
                  }
                >
                  {alarme.descricao && <p className={styles.descricao}>{alarme.descricao}</p>}
                  <p className={styles.repeticao}>
                    {resumoDoAlarme(alarme)}
                    {alarme.ativo && proximoToque(alarme) ? ` · próximo ${textoDoToque(proximoToque(alarme))}` : ''}
                  </p>
                </PetCard>
              ))}
            </div>
          )}

          <SummaryBar
            icon={<InfoIcon size={20} />}
            actions={<PillButton onClick={() => setHistoryOpen(true)}>Histórico de disparos</PillButton>}
          >
            <strong>{alarmes.length}</strong> {alarmes.length === 1 ? 'alarme' : 'alarmes'}: {ativos}{' '}
            {ativos === 1 ? 'ativo' : 'ativos'} e {pausados} {pausados === 1 ? 'pausado' : 'pausados'}.
          </SummaryBar>

          <ReportDialog
            open={historyOpen}
            pdf={relatoriosService.pdfAlarmes}
            pdfPeriodo={false}
            onClose={() => setHistoryOpen(false)}
            title="Histórico de alarmes"
            description="Últimas vezes que o ESP32 tocou."
            stats={[
              { label: 'Ativos', value: ativos },
              { label: 'Pausados', value: pausados },
              { label: 'Disparos registrados', value: data.historicoAlarmes.length },
            ]}
            items={[...data.historicoAlarmes]
              .sort((a, b) => b.quando.localeCompare(a.quando))
              .map((h) => ({
                id: h.id,
                when: `${formatDateBr(h.quando.slice(0, 10)).slice(0, 5)} ${h.quando.slice(11, 16)}`,
                title: h.nome,
                detail: h.resultado,
              }))}
          />

          <Dialog
            open={deviceOpen}
            onClose={() => setDeviceOpen(false)}
            title="Alarme de medicação"
            description="ESP32 com display LCD 16x2 (módulo I2C) e buzzer. Funciona longe do computador, ligado num carregador de celular ou power bank."
            size="lg"
            footer={<PillButton onClick={() => setDeviceOpen(false)}>Fechar</PillButton>}
          >
            <div className={styles.dispositivo}>
              <EsquemaAlarme />
              <table className={styles.ligacoes}>
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Pino da peça</th>
                    <th>Pino do ESP32</th>
                  </tr>
                </thead>
                <tbody>
                  {LIGACOES.map((l, i) => (
                    <tr key={i}>
                      <td>
                        <span className={styles.fio} style={{ background: l.cor }} aria-hidden="true" />
                        {l.peca}
                      </td>
                      <td>{l.pino}</td>
                      <td>{l.esp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ol className={styles.passos}>
                <li>
                  Ligue a caixinha na tomada. Na primeira vez (ou num lugar novo), o display mostra{' '}
                  <strong>Configurar Wi-Fi</strong>.
                </li>
                <li>
                  No celular, entre na rede <strong>Pawtinhas-Alarme</strong> (senha <strong>pawtinhas</strong>). A
                  página de configuração abre sozinha; se não abrir, acesse <code>192.168.4.1</code>.
                </li>
                <li>
                  Escolha o Wi-Fi do lugar e digite a senha. Ela guarda até 5 redes e acha a API sozinha, sem precisar
                  do IP do computador.
                </li>
                <li>
                  O botão <strong>BOOT</strong> da placa desliga o alarme tocando. Com a tela parada, um toque mostra a
                  rede e o IP, e segurar 3 segundos abre a configuração de novo.
                </li>
              </ol>
              <p className={styles.dispositivoNota}>
                Use jumpers fêmea-fêmea, ligando pino com pino. O programa e o passo a passo de gravação estão na pasta{' '}
                <code>firmware/alarme-esp32</code> do projeto da API.
              </p>
            </div>
          </Dialog>
        </>
      )}
    </Page>
  )
}
