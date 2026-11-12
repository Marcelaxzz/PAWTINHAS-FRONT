/**
 * Fotos escolhidas na hora, antes de irem para a API. No site elas chegam como data URL;
 * o app mobile troca este módulo por um equivalente que trabalha com o arquivo do celular.
 */

/** Foto nova (ainda não enviada), em vez de um endereço já salvo. */
export function ehFotoNova(valor) {
  return typeof valor === 'string' && valor.startsWith('data:image/')
}

/** Data URL → corpo multipart com o campo "arquivo", sem fetch (a CSP do site bloqueia requisições a "data:"). */
export function formularioDaFoto(dataUrl) {
  const [cabecalho, base64] = dataUrl.split(',')
  const tipo = cabecalho.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  const formulario = new FormData()
  formulario.append('arquivo', new Blob([bytes], { type: tipo }), 'foto')
  return formulario
}
