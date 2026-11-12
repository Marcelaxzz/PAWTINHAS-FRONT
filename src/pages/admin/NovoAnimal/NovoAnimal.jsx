import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimalForm } from '../AnimalForm/AnimalForm.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import formStyles from '../../../components/ResourceForm/ResourceForm.module.css'

export function NovoAnimal() {
  const navigate = useNavigate()
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const cadastrar = async (payload) => {
    setSaving(true)
    try {
      const animal = await dataService.create('animais', payload)
      toast.success(`${animal.nome} foi cadastrado(a) para adoção!`)
      navigate('/admin/adocoes', { replace: true })
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
    }
  }

  return (
    <Page title="Novo animal para adoção" subtitle="Preencha a ficha do animal que vai para o catálogo.">
      <div className={formStyles.cartao}>
        <AnimalForm
          onSubmit={cadastrar}
          onCancel={() => navigate('/admin/adocoes')}
          saving={saving}
          submitLabel="Cadastrar animal"
        />
      </div>
    </Page>
  )
}
