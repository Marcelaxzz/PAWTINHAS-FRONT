/*
 * Service worker só dos alarmes: permite a notificação do sistema (canto da tela do Windows, do Mac ou do
 * celular) ter o botão "Desligar alarme". Não guarda páginas em cache nem intercepta pedidos.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (evento) => {
  const notificacao = evento.notification
  const dados = notificacao.data || {}
  notificacao.close()

  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (evento.action === 'parar') {
        // A aba que está tocando desliga o som e avisa o servidor (app e caixinha param também).
        janelas.forEach((janela) => janela.postMessage({ tipo: 'pawtinhas-parar-alarme', minuto: dados.minuto }))
        return
      }
      // Clique no corpo da notificação: traz o painel para a frente.
      const aberta = janelas.find((janela) => 'focus' in janela)
      if (aberta) await aberta.focus()
      else await self.clients.openWindow('/alarmes')
    })(),
  )
})
