import Header from '../components/header';
import ProjectsDashboard from '../components/projects-dashboard';

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <ProjectsDashboard />
      </main>
    </div>
  );
}
