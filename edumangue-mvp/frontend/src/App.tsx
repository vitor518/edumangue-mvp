import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import type { Papel } from './lib/types';
import { HOME, LoginPage } from './pages/Login';
import { AvisosPage } from './pages/Avisos';
import { AgendaPage } from './pages/Agenda';
import { AlunoPainel } from './pages/aluno/Painel';
import { AlunoAtividades } from './pages/aluno/Atividades';
import { AtividadeRunner } from './pages/aluno/AtividadeRunner';
import { AlunoFrequencia } from './pages/aluno/Frequencia';
import { ProfessorPainel } from './pages/professor/Painel';
import { ChamadaPage } from './pages/professor/Chamada';
import { ProfessorAtividades } from './pages/professor/Atividades';
import { AtividadeForm } from './pages/professor/AtividadeForm';
import { Resultados } from './pages/professor/Resultados';
import { CoordenadorDashboard } from './pages/coordenador/Dashboard';
import { UsuariosPage } from './pages/coordenador/Usuarios';
import { EstruturaPage } from './pages/coordenador/Estrutura';

function Protegido({ papeis, children }: { papeis?: Papel[]; children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Spinner />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (papeis && !papeis.includes(usuario.papel)) return <Navigate to={HOME[usuario.papel]} replace />;
  return <>{children}</>;
}

function Raiz() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Spinner />;
  return <Navigate to={usuario ? HOME[usuario.papel] : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Raiz />} />
          <Route element={<Protegido><Layout /></Protegido>}>
            <Route path="/avisos" element={<AvisosPage />} />
            <Route path="/agenda" element={<AgendaPage />} />

            <Route path="/aluno" element={<Protegido papeis={['aluno']}><AlunoPainel /></Protegido>} />
            <Route path="/aluno/atividades" element={<Protegido papeis={['aluno']}><AlunoAtividades /></Protegido>} />
            <Route path="/aluno/atividades/:id" element={<Protegido papeis={['aluno']}><AtividadeRunner /></Protegido>} />
            <Route path="/aluno/frequencia" element={<Protegido papeis={['aluno']}><AlunoFrequencia /></Protegido>} />

            <Route path="/professor" element={<Protegido papeis={['professor']}><ProfessorPainel /></Protegido>} />
            <Route path="/professor/chamada" element={<Protegido papeis={['professor']}><ChamadaPage /></Protegido>} />
            <Route path="/professor/chamada/:alocacao" element={<Protegido papeis={['professor']}><ChamadaPage /></Protegido>} />
            <Route path="/professor/atividades" element={<Protegido papeis={['professor']}><ProfessorAtividades /></Protegido>} />
            <Route path="/professor/atividades/nova" element={<Protegido papeis={['professor']}><AtividadeForm /></Protegido>} />
            <Route path="/professor/atividades/:id/editar" element={<Protegido papeis={['professor']}><AtividadeForm /></Protegido>} />
            <Route path="/professor/atividades/:id/resultados" element={<Protegido papeis={['professor']}><Resultados /></Protegido>} />

            <Route path="/coordenador" element={<Protegido papeis={['coordenador']}><CoordenadorDashboard /></Protegido>} />
            <Route path="/coordenador/usuarios" element={<Protegido papeis={['coordenador']}><UsuariosPage /></Protegido>} />
            <Route path="/coordenador/estrutura" element={<Protegido papeis={['coordenador']}><EstruturaPage /></Protegido>} />
          </Route>
          <Route path="*" element={<Raiz />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
