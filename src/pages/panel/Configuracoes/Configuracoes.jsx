import { useCallback, useEffect, useState } from 'react'
import { Page } from '../../../layouts/Page/Page.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { SummaryBar } from '../../../components/ui/SummaryBar.jsx'
import { Toggle } from '../../../components/ui/Toggle.jsx'
import { Chip } from '../../../components/ui/Chip.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { DownloadIcon } from '../../../components/Icons/Icons.jsx'
import { ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { useAuth } from '../../../hooks/useAuth.js'
import { useCollections } from '../../../hooks/useCollections.js'
import { useToast } from '../../../hooks/useToast.js'
import { clinicService } from '../../../services/clinicService.js'
import { dataService } from '../../../services/dataService.js'
import { formatDateBr } from '../../../utils/dates.js'
import { maskPhone } from '../../../utils/masks.js'
import { initials } from '../../../utils/text.js'
import styles from './Configuracoes.module.css'

// Minutos sem contato a partir dos quais o ESP32 é considerado desconectado.
const ESP32_ONLINE_MINUTOS = 10

/** Converte "2026-10-18T22:01:09.2" em "18/10/2026 às 22:01". */
function dataHora(valor) {
  return valor ? `${formatDateBr(valor.slice(0, 10))} às ${valor.slice(11, 16)}` : null
}

function statusEsp32(status) {
  if (!status) return { tone: 'neutro', texto: 'Verificando…', detalhe: '' }
  if (!status.dispositivoConfigurado)
    return { tone: 'perigo', texto: 'Sem chave', detalhe: 'Configure Dispositivo:Chave na API para ativar.' }
  if (!status.dispositivoUltimoContato)
    return { tone: 'neutro', texto: 'Aguardando', detalhe: 'O dispositivo ainda não se conectou.' }
  const minutos = (Date.now() - new Date(status.dispositivoUltimoContato).getTime()) / 60000
  return {
    tone: minutos <= ESP32_ONLINE_MINUTOS ? 'sucesso' : 'alerta',
    texto: minutos <= ESP32_ONLINE_MINUTOS ? 'Online' : 'Sem contato',
    detalhe: `Último contato: ${dataHora(status.dispositivoUltimoContato)}`,
  }
}

function baixarArquivo(conteudo, nome) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}

function maskCnpj(value) {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function Configuracoes() {
  const { data, loading, error, reload, patchLocal } = useCollections(['configuracoes'])

  return (
    <Page title="Configurações" subtitle="Dados da clínica, notificações, acesso e integrações.">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data?.configuracoes[0] && (
        <ConfigContent settings={data.configuracoes[0]} patchLocal={patchLocal} />
      )}
    </Page>
  )
}

function ConfigContent({ settings, patchLocal }) {
  const toast = useToast()
  const { user } = useAuth()
  const [form, setForm] = useState(() => structuredClone(settings))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [baixando, setBaixando] = useState(false)

  const carregarStatus = useCallback(() => {
    clinicService
      .statusIntegracoes()
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    carregarStatus()
  }, [carregarStatus])

  const baixarBackup = async () => {
    setBaixando(true)
    try {
      const dados = await clinicService.baixarBackup()
      const agora = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const nome = `pawtinhas-backup-${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}-${pad(agora.getHours())}${pad(agora.getMinutes())}.json`
      baixarArquivo(JSON.stringify(dados, null, 2), nome)
      toast.success('Backup baixado. Guarde o arquivo em um local seguro.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBaixando(false)
    }
  }

  const setClinic = (field, value) => setForm((prev) => ({ ...prev, clinica: { ...prev.clinica, [field]: value } }))
  const setGroup = (group, key, value) => setForm((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }))

  const save = async () => {
    if (!form.clinica.nome.trim()) {
      toast.error('Informe o nome da clínica.')
      return
    }
    setSaving(true)
    try {
      const updated = await dataService.update('configuracoes', settings.id, form)
      patchLocal('configuracoes', updated)
      setForm(structuredClone(updated))
      setEditing(false)
      carregarStatus()
      toast.success('Alterações salvas!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  return (
    <>
      <div className={styles.grade}>
        <div className={styles.coluna}>
          <section className={styles.cartao} aria-labelledby="perfil-clinica">
            <header className={styles.cartaoTopo}>
              <h2 id="perfil-clinica">Perfil da clínica</h2>
              <PillButton variant="contorno" onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
                {editing ? 'Concluir edição' : 'Editar perfil'}
              </PillButton>
            </header>
            <FieldGrid className={styles.campos}>
              <Field
                label="Nome da clínica"
                span={2}
                variant="areia"
                readOnly={!editing}
                maxLength={80}
                value={form.clinica.nome}
                onChange={(e) => setClinic('nome', e.target.value)}
              />
              <Field
                label="Endereço"
                span={2}
                variant="areia"
                readOnly={!editing}
                maxLength={140}
                value={form.clinica.endereco}
                onChange={(e) => setClinic('endereco', e.target.value)}
              />
              <Field
                label="Telefone"
                variant="areia"
                readOnly={!editing}
                inputMode="tel"
                maxLength={15}
                value={form.clinica.telefone}
                onChange={(e) => setClinic('telefone', maskPhone(e.target.value))}
              />
              <Field
                label="CNPJ"
                variant="areia"
                readOnly={!editing}
                inputMode="numeric"
                maxLength={18}
                value={form.clinica.cnpj}
                onChange={(e) => setClinic('cnpj', maskCnpj(e.target.value))}
              />
            </FieldGrid>
          </section>

          <section className={styles.cartao} aria-labelledby="acesso">
            <h2 id="acesso" className={styles.tituloSolto}>
              Acesso ao painel
            </h2>
            <ul className={styles.usuarios}>
              <li>
                <span className={styles.avatar} aria-hidden="true">
                  {initials(user?.name ?? '')}
                </span>
                <span className={styles.usuarioTexto}>
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </span>
                <Chip size="xs">Veterinária responsável</Chip>
              </li>
            </ul>
          </section>
        </div>

        <div className={styles.coluna}>
          <section className={styles.cartao} aria-labelledby="notificacoes">
            <h2 id="notificacoes" className={styles.tituloSolto}>
              Notificações
            </h2>
            <div className={styles.toggles}>
              <Toggle
                label="Resumo diário da agenda por e-mail"
                description={
                  status?.emailResumo
                    ? `Enviado às 7h para ${status.emailResumo}.`
                    : 'Enviado às 7h para o e-mail da veterinária.'
                }
                checked={Boolean(form.notificacoes.resumoDiarioEmail)}
                onChange={(value) => setGroup('notificacoes', 'resumoDiarioEmail', value)}
              />
              <Toggle
                label="Alarmes no dispositivo ESP32"
                description="Desligado, o ESP32 deixa de receber os lembretes cadastrados."
                checked={Boolean(form.notificacoes.alarmesEsp32)}
                onChange={(value) => setGroup('notificacoes', 'alarmesEsp32', value)}
              />
            </div>
          </section>

          <section className={styles.cartao} aria-labelledby="integracoes">
            <h2 id="integracoes" className={styles.tituloSolto}>
              Integrações
            </h2>
            <ul className={styles.integracoes}>
              <li>
                <span>
                  <strong>ESP32 (alarme de medicação)</strong>
                  <small>{statusEsp32(status).detalhe}</small>
                </span>
                <Chip tone={statusEsp32(status).tone} size="sm">
                  {statusEsp32(status).texto}
                </Chip>
              </li>
              <li>
                <span>
                  <strong>E-mail (códigos de acesso e resumo)</strong>
                  <small>Servidor SMTP definido na configuração da API.</small>
                </span>
                <Chip tone={status?.emailConfigurado ? 'sucesso' : 'perigo'} size="sm">
                  {status ? (status.emailConfigurado ? 'Configurado' : 'Não configurado') : '…'}
                </Chip>
              </li>
              <li className={styles.integracaoBackup}>
                <Toggle
                  label="Backup automático diário"
                  description={
                    status?.ultimoBackup
                      ? `Cópia às 3h na pasta de backups do servidor. Último: ${dataHora(status.ultimoBackup)}.`
                      : 'Cópia às 3h na pasta de backups do servidor (mantém os 14 mais recentes).'
                  }
                  checked={Boolean(form.integracoes.backupAutomatico)}
                  onChange={(value) => setGroup('integracoes', 'backupAutomatico', value)}
                />
                <PillButton variant="contorno" size="sm" onClick={baixarBackup} loading={baixando}>
                  <DownloadIcon size={15} />
                  Baixar backup agora
                </PillButton>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <SummaryBar
        actions={
          <PillButton size="lg" onClick={save} loading={saving}>
            Salvar alterações
          </PillButton>
        }
      >
        Última atualização do sistema realizada em: {formatDateBr(settings.atualizadoEm.slice(0, 10))} às{' '}
        {settings.atualizadoEm.slice(11, 16)}
        {dirty && <span className={styles.pendente}> · Você tem alterações não salvas.</span>}
      </SummaryBar>
    </>
  )
}
