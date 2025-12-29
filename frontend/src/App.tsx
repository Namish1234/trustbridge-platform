import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import ScorePage from './pages/ScorePage';
import DashboardPage from './pages/DashboardPage';
import ComparePage from './pages/ComparePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="score" element={<ScorePage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="compare" element={<ComparePage />} />
              <Route path="about" element={<AboutPage />} />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
