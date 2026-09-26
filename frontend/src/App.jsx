import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import RequireAuth from './components/RequireAuth';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import RefundPolicy from './pages/RefundPolicy';
import NotFound from './pages/NotFound';

import AdminLayout from './admin/AdminLayout';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';
import ProjectsList from './admin/ProjectsList';
import ProjectForm from './admin/ProjectForm';
import Taxonomy from './admin/Taxonomy';
import Services from './admin/Services';
import Experience from './admin/Experience';
import SettingsPage from './admin/Settings';
import Messages from './admin/Messages';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ProjectsList />} />
        <Route path="projects/new" element={<ProjectForm />} />
        <Route path="projects/:id/edit" element={<ProjectForm />} />
        <Route path="taxonomy" element={<Taxonomy />} />
        <Route path="services" element={<Services />} />
        <Route path="experience" element={<Experience />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="messages" element={<Messages />} />
      </Route>
    </Routes>
  );
}
