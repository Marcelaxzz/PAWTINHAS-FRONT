import { photoSrc } from '../../../utils/images.js'
import friskiesSeco from '../../../assets/images/racao-friskies-seco.webp'
import friskiesSache from '../../../assets/images/racao-friskies-sache.webp'
import whiskasSache from '../../../assets/images/racao-whiskas-sache.webp'
import goldenGatos from '../../../assets/images/racao-golden-gatos.webp'
import goldenCastrados from '../../../assets/images/racao-golden-castrados.webp'
import goldenGatosFilhotes from '../../../assets/images/racao-golden-gatos-filhotes.webp'
import goldenCaes from '../../../assets/images/racao-golden-caes.webp'
import dogChowFilhotes from '../../../assets/images/racao-dogchow-filhotes.webp'
import premierCaes from '../../../assets/images/racao-premier-caes.webp'
import premierGatos from '../../../assets/images/racao-premier-gatos.webp'
import granPlusGatos from '../../../assets/images/racao-granplus-gatos.webp'
import quatreeGatos from '../../../assets/images/racao-quatree-gatos.webp'
import pedigreeSache from '../../../assets/images/racao-pedigree-sache.webp'
import remedioAmoxicilina from '../../../assets/images/remedio-amoxicilina.webp'
import remedioMeloxicam from '../../../assets/images/remedio-meloxicam.webp'
import remedioDipirona from '../../../assets/images/remedio-dipirona.webp'
import remedioOmeprazol from '../../../assets/images/remedio-omeprazol.webp'
import remedioMetronidazol from '../../../assets/images/remedio-metronidazol.webp'
import materialSeringa from '../../../assets/images/material-seringa.webp'
import materialAgulha from '../../../assets/images/material-agulha.webp'
import materialLuvas from '../../../assets/images/material-luvas.webp'
import materialEsparadrapo from '../../../assets/images/material-esparadrapo.webp'
import materialGaze from '../../../assets/images/material-gaze.webp'
import materialAtadura from '../../../assets/images/material-atadura.webp'
import materialClorexidina from '../../../assets/images/material-clorexidina.webp'
import materialIodo from '../../../assets/images/material-iodo.webp'
import materialInstrumental from '../../../assets/images/material-instrumental.webp'
import materialMascara from '../../../assets/images/material-mascara.webp'
import materialSoro from '../../../assets/images/material-soro.webp'
import materialEquipo from '../../../assets/images/material-equipo.webp'
import materialSutura from '../../../assets/images/material-sutura.webp'
import materialCateter from '../../../assets/images/material-cateter.webp'
import remedioComprimido from '../../../assets/images/remedio-comprimido.webp'
import remedioCapsula from '../../../assets/images/remedio-capsula.webp'
import remedioGotas from '../../../assets/images/remedio-gotas.webp'
import remedioOral from '../../../assets/images/remedio-oral.webp'
import remedioInjetavel from '../../../assets/images/remedio-injetavel.webp'

const ehGato = (r) => r.especie === 'Gato'
const umida = (r) => r.tipo === 'Úmida'
const filhote = (r) => r.fase === 'Filhote'
const castradoOuLight = (r) => /castrad|esteriliz|light|obes/i.test(r.nome ?? '')
const pequenoOuSenior = (r) => /light|pequen|mini|s[eê]nior|idos/i.test(r.nome ?? '')

// Marca escrita no nome da ração -> foto da embalagem dessa marca.
const MARCAS = [
  [/friskies/i, (r) => (umida(r) ? friskiesSache : friskiesSeco)],
  [/whiskas/i, () => whiskasSache],
  [/pedigree/i, () => pedigreeSache],
  [/dog\s*chow/i, () => dogChowFilhotes],
  [/gran\s*plus/i, () => granPlusGatos],
  [/quatree/i, () => quatreeGatos],
  [/premier/i, (r) => (ehGato(r) ? premierGatos : premierCaes)],
  [
    /golden/i,
    (r) => {
      if (!ehGato(r)) return goldenCaes
      if (filhote(r)) return goldenGatosFilhotes
      return castradoOuLight(r) ? goldenCastrados : goldenGatos
    },
  ],
]

/** Sem marca no nome: uma embalagem real que combine com a espécie, o tipo e a fase. */
function embalagemParecida(r) {
  if (ehGato(r)) {
    if (umida(r)) return filhote(r) ? whiskasSache : friskiesSache
    if (filhote(r)) return premierGatos
    return castradoOuLight(r) ? goldenCastrados : friskiesSeco
  }
  if (umida(r)) return pedigreeSache
  if (filhote(r)) return dogChowFilhotes
  return pequenoOuSenior(r) ? premierCaes : goldenCaes
}

/** Foto da ração: a enviada no cadastro ou a embalagem real (créditos em assets/images/CREDITOS.md). */
export function fotoDaRacao(r) {
  const propria = photoSrc(r.foto)
  if (propria) return propria
  const marca = MARCAS.find(([padrao]) => padrao.test(r.nome ?? ''))
  return marca ? marca[1](r) : embalagemParecida(r)
}

// Princípio ativo (no nome ou no campo próprio) -> foto da caixa desse remédio.
const REMEDIOS = [
  [/amoxicilin/i, remedioAmoxicilina],
  [/meloxicam|maxicam/i, remedioMeloxicam],
  [/dipiron|metamizol/i, remedioDipirona],
  [/omeprazol/i, remedioOmeprazol],
  [/metronidazol/i, remedioMetronidazol],
]

const POR_FORMA = {
  Comprimido: remedioComprimido,
  Cápsula: remedioCapsula,
  Gotas: remedioGotas,
  'Solução oral': remedioOral,
  'Suspensão oral': remedioOral,
  Injetável: remedioInjetavel,
}

/** Foto da caixa do medicamento; sem caixa conhecida, uma foto real da apresentação (comprimido, gotas…). */
export function fotoDoMedicamento(m) {
  const texto = `${m.nome ?? ''} ${m.principioAtivo ?? ''}`
  const caixa = REMEDIOS.find(([padrao]) => padrao.test(texto))
  return caixa ? caixa[1] : (POR_FORMA[m.forma] ?? remedioComprimido)
}

// Palavra no nome do material -> foto real dele. A ordem importa: "equipo" antes de "soro".
const MATERIAIS = [
  [/seringa/i, materialSeringa],
  [/agulha/i, materialAgulha],
  [/luva/i, materialLuvas],
  [/esparadrapo|micropore|fita/i, materialEsparadrapo],
  [/atadura|bandagem|crepom/i, materialAtadura],
  [/gaze|compressa|algod/i, materialGaze],
  [/clorexidin|[aá]lcool|antiss[eé]ptico/i, materialClorexidina],
  [/iod|povidin|povidon/i, materialIodo],
  [/m[aá]scara|touca|propé/i, materialMascara],
  [/equipo/i, materialEquipo],
  [/soro|ringer|fisiol[oó]gic|glicos/i, materialSoro],
  [/fio|sutura|nylon|n[aá]ilon|categute/i, materialSutura],
  [/cateter|scalp|abocath|jelco/i, materialCateter],
  [/pin[cç]a|tesoura|bisturi|l[aâ]mina|porta.?agulha|instrumental|kit cir/i, materialInstrumental],
]

const POR_TIPO = {
  Curativo: materialGaze,
  Fluidoterapia: materialSoro,
  Cirúrgico: materialInstrumental,
  Descartável: materialSeringa,
  Antissepsia: materialClorexidina,
}

/** Foto real do material, pelo nome; senão, pelo tipo. */
export function fotoDoMaterial(m) {
  const achado = MATERIAIS.find(([padrao]) => padrao.test(m.nome ?? ''))
  return achado ? achado[1] : (POR_TIPO[m.tipo] ?? materialGaze)
}
