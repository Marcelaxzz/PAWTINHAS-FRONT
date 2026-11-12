import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { dataService } from '../../services/dataService.js'

/** Lê ?pet=ID e carrega o paciente correspondente (se existir). query repete o ?pet= para os links. */
export function usePetFromQuery() {
  const [params] = useSearchParams()
  const petId = params.get('pet')
  const [state, setState] = useState({ petId: null, pet: null })

  useEffect(() => {
    if (!petId) return undefined
    let active = true
    dataService
      .get('pets', petId)
      .then((pet) => active && setState({ petId, pet }))
      .catch(() => active && setState({ petId, pet: null }))
    return () => {
      active = false
    }
  }, [petId])

  const query = petId ? `?pet=${encodeURIComponent(petId)}` : ''
  return { petId, pet: state.petId === petId ? state.pet : null, query }
}
