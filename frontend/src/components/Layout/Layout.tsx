import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import DemoBanner from '../DemoBanner';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <Navigation />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;