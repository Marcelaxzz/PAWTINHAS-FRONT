/**
 * Baixa um arquivo gerado no navegador (PDF dos relatórios, backup, STL).
 * No app mobile este módulo é trocado por src/plataforma/salvarArquivo (abre o compartilhamento).
 */
export async function salvarArquivo(conteudo, nome, tipo = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
