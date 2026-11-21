import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { GuestRoute, PrivateRoute } from './routes/RouteGuards.jsx'
import { LoadingScreen } from './components/LoadingScreen/LoadingScreen.jsx'
import { ScrollToTop } from './components/ScrollToTop/ScrollToTop.jsx'
import { AlarmesDaConta } from './components/AlarmesNoNavegador/AlarmesDaConta.jsx'

const page = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))

// Acesso
const Welcome = page(() => import('./pages/Welcome/Welcome.jsx'), 'Welcome')
const Login = page(() => import('./pages/auth/Login/Login.jsx'), 'Login')
const ResetPassword = page(() => import('./pages/auth/ResetPassword/ResetPassword.jsx'), 'ResetPassword')
const VerifyCode = page(() => import('./pages/auth/VerifyCode/VerifyCode.jsx'), 'VerifyCode')

// Painel da veterinária
const PanelLayout = page(() => import('./layouts/PanelLayout/PanelLayout.jsx'), 'PanelLayout')
const Home = page(() => import('./pages/Home/Home.jsx'), 'Home')
const Agenda = page(() => import('./pages/panel/Agenda/Agenda.jsx'), 'Agenda')
const ConsultasVacinas = page(() => import('./pages/panel/ConsultasVacinas/ConsultasVacinas.jsx'), 'ConsultasVacinas')
const Cirurgias = page(() => import('./pages/panel/Cirurgias/Cirurgias.jsx'), 'Cirurgias')
const BanhoTosa = page(() => import('./pages/panel/BanhoTosa/BanhoTosa.jsx'), 'BanhoTosa')
const PetSitter = page(() => import('./pages/panel/PetSitter/PetSitter.jsx'), 'PetSitter')
const Emergencias = page(() => import('./pages/panel/Emergencias/Emergencias.jsx'), 'Emergencias')
const Alarmes = page(() => import('./pages/panel/Alarmes/Alarmes.jsx'), 'Alarmes')
const AlarmeForm = page(() => import('./pages/panel/AlarmeForm/AlarmeForm.jsx'), 'AlarmeForm')
const Pacientes = page(() => import('./pages/panel/Pacientes/Pacientes.jsx'), 'Pacientes')
const PacienteFicha = page(() => import('./pages/panel/PacienteFicha/PacienteFicha.jsx'), 'PacienteFicha')
const Tutores = page(() => import('./pages/panel/Tutores/Tutores.jsx'), 'Tutores')
const PacienteForm = page(() => import('./pages/panel/PacienteForm/PacienteForm.jsx'), 'PacienteForm')
const Configuracoes = page(() => import('./pages/panel/Configuracoes/Configuracoes.jsx'), 'Configuracoes')
const formularios = () => import('./pages/panel/Formularios/Formularios.jsx')
const NovaCirurgia = page(formularios, 'NovaCirurgia')
const NovaConsulta = page(formularios, 'NovaConsulta')
const NovaVacina = page(formularios, 'NovaVacina')
const NovoBanho = page(formularios, 'NovoBanho')
const NovaVisita = page(formularios, 'NovaVisita')
const NovaEmergencia = page(formularios, 'NovaEmergencia')

// Calculadoras clínicas
const CalculoDose = page(() => import('./pages/calculadoras/CalculoDose/CalculoDose.jsx'), 'CalculoDose')
const CalculoRacao = page(() => import('./pages/calculadoras/CalculoRacao/CalculoRacao.jsx'), 'CalculoRacao')
const CatalogoMedicamentos = page(
  () => import('./pages/calculadoras/Catalogos/CatalogoMedicamentos.jsx'),
  'CatalogoMedicamentos',
)
const CatalogoRacoes = page(() => import('./pages/calculadoras/Catalogos/CatalogoRacoes.jsx'), 'CatalogoRacoes')
const CatalogoMateriais = page(
  () => import('./pages/calculadoras/Catalogos/CatalogoMateriais.jsx'),
  'CatalogoMateriais',
)

// Adoção (pública)
const AdocaoLayout = page(() => import('./layouts/AdocaoLayout/AdocaoLayout.jsx'), 'AdocaoLayout')
const Catalogo = page(() => import('./pages/adocao/Catalogo/Catalogo.jsx'), 'Catalogo')
const AnimalDetalhe = page(() => import('./pages/adocao/AnimalDetalhe/AnimalDetalhe.jsx'), 'AnimalDetalhe')
const Favoritos = page(() => import('./pages/adocao/Favoritos/Favoritos.jsx'), 'Favoritos')
const ComoAdotar = page(() => import('./pages/adocao/ComoAdotar/ComoAdotar.jsx'), 'ComoAdotar')
const Sobre = page(() => import('./pages/adocao/Sobre/Sobre.jsx'), 'Sobre')

// Administração de adoções
const AdminAdocoes = page(() => import('./pages/admin/AdminAdocoes/AdminAdocoes.jsx'), 'AdminAdocoes')
const NovoAnimal = page(() => import('./pages/admin/NovoAnimal/NovoAnimal.jsx'), 'NovoAnimal')

const NotFound = page(() => import('./pages/NotFound/NotFound.jsx'), 'NotFound')

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <ToastProvider>
          <AlarmesDaConta />
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<Welcome />} />

              <Route element={<GuestRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/redefinir-senha" element={<ResetPassword />} />
              </Route>
              {/* Fora do GuestRoute: ao validar o código a própria tela redireciona. */}
              <Route path="/login/verificacao" element={<VerifyCode mode="login" />} />
              <Route path="/redefinir-senha/verificacao" element={<VerifyCode mode="reset" />} />

              <Route element={<AdocaoLayout />}>
                <Route path="/adocao" element={<Catalogo />} />
                <Route path="/adocao/:id" element={<AnimalDetalhe />} />
                <Route path="/favoritos" element={<Favoritos />} />
                <Route path="/como-adotar" element={<ComoAdotar />} />
                <Route path="/sobre" element={<Sobre />} />
              </Route>

              <Route element={<PrivateRoute />}>
                <Route element={<PanelLayout />}>
                  <Route path="/inicio" element={<Home />} />
                  <Route path="/agenda" element={<Agenda />} />
                  <Route path="/agenda/consultas-vacinas" element={<ConsultasVacinas />} />
                  <Route path="/agenda/consultas" element={<Navigate to="/agenda/consultas-vacinas" replace />} />
                  <Route path="/agenda/vacinas" element={<Navigate to="/agenda/consultas-vacinas#vacinas" replace />} />
                  <Route path="/agenda/consultas/nova" element={<NovaConsulta />} />
                  <Route path="/agenda/consultas/:id/editar" element={<NovaConsulta />} />
                  <Route path="/agenda/vacinas/nova" element={<NovaVacina />} />
                  <Route path="/agenda/vacinas/:id/editar" element={<NovaVacina />} />
                  <Route path="/agenda/cirurgias" element={<Cirurgias />} />
                  <Route path="/agenda/cirurgias/nova" element={<NovaCirurgia />} />
                  <Route path="/agenda/cirurgias/:id/editar" element={<NovaCirurgia />} />
                  <Route path="/agenda/banho-tosa" element={<BanhoTosa />} />
                  <Route path="/agenda/banho-tosa/novo" element={<NovoBanho />} />
                  <Route path="/agenda/banho-tosa/:id/editar" element={<NovoBanho />} />
                  <Route path="/agenda/pet-sitter" element={<PetSitter />} />
                  <Route path="/agenda/pet-sitter/nova" element={<NovaVisita />} />
                  <Route path="/agenda/pet-sitter/:id/editar" element={<NovaVisita />} />
                  <Route path="/agenda/emergencias" element={<Emergencias />} />
                  <Route path="/agenda/emergencias/nova" element={<NovaEmergencia />} />
                  <Route path="/agenda/emergencias/:id/editar" element={<NovaEmergencia />} />
                  <Route path="/alarmes" element={<Alarmes />} />
                  <Route path="/alarmes/novo" element={<AlarmeForm />} />
                  <Route path="/alarmes/:id/editar" element={<AlarmeForm />} />
                  <Route path="/pacientes" element={<Pacientes />} />
                  <Route path="/pacientes/novo" element={<PacienteForm />} />
                  <Route path="/pacientes/tutores" element={<Tutores />} />
                  <Route path="/pacientes/:id" element={<PacienteFicha />} />
                  <Route path="/pacientes/:id/editar" element={<PacienteForm />} />
                  <Route path="/configuracoes" element={<Configuracoes />} />
                  <Route path="/calculadoras" element={<Navigate to="/calculadoras/dose" replace />} />
                  <Route path="/calculadoras/dose" element={<CalculoDose />} />
                  <Route path="/calculadoras/racao" element={<CalculoRacao />} />
                  <Route path="/calculadoras/medicamentos" element={<CatalogoMedicamentos />} />
                  <Route path="/calculadoras/racoes" element={<CatalogoRacoes />} />
                  <Route path="/calculadoras/materiais" element={<CatalogoMateriais />} />
                  <Route path="/admin/adocoes" element={<AdminAdocoes />} />
                  <Route path="/admin/adocoes/novo" element={<NovoAnimal />} />
                  <Route path="/admin/adocoes/:id/editar" element={<AdminAdocoes />} />
                  <Route path="/admin" element={<Navigate to="/admin/adocoes" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
