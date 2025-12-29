import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Eye } from 'lucide-react';
import ConsentManager from '../ConsentManager';

const Navigation: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConsentManagerOpen, setIsConsentManagerOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/score', label: 'Score', side: 'left' },
    { path: '/compare', label: 'Compare', side: 'left' },
    { path: '/dashboard', label: 'Dashboard', side: 'right' },
    { path: '/about', label: 'About', side: 'right' },
  ];

  const leftLinks = navLinks.filter(link => link.side === 'left');
  const rightLinks = navLinks.filter(link => link.side === 'right');

  const NavLink = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className={`relative group px-3 py-2 text-sm font-medium rounded-md transition-colors duration-300 ${
        isActive(to)
          ? 'text-blue-600 bg-blue-50/50'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      {label}
      <span 
        className={`absolute bottom-0 left-0 h-[2px] bg-blue-600 transition-all duration-300 ease-out rounded-full ${
          isActive(to) ? 'w-full' : 'w-0 group-hover:w-full'
        }`}
      />
    </Link>
  );

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 relative">
            
            {/* =========================================
                DESKTOP LAYOUT 
               ========================================= */}
            <div className="hidden md:flex w-full items-center justify-center">
              
              {/* CENTER GROUP: Consistent gap-4 everywhere */}
              <div className="flex items-center gap-4">
                
                {/* Left Links Container: gap-4 */}
                <div className="flex items-center gap-4">
                  {leftLinks.map((link) => (
                    <NavLink key={link.path} to={link.path} label={link.label} />
                  ))}
                </div>

                {/* Center Logo */}
                <Link to="/" className="flex items-center px-2">
                  <img 
                    src="/logo.png" 
                    alt="TrustBridge Logo" 
                    className="h-7 w-auto object-contain"
                  />
                </Link>

                {/* Right Links Container: gap-4 */}
                <div className="flex items-center gap-4">
                  {rightLinks.map((link) => (
                    <NavLink key={link.path} to={link.path} label={link.label} />
                  ))}
                </div>
              </div>

              {/* FAR RIGHT ELEMENT: Privacy Button */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setIsConsentManagerOpen(true)}
                  className="flex items-center px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                  title="Manage Data Permissions"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  <span>Privacy</span>
                </button>
              </div>

            </div>

            {/* =========================================
                MOBILE LAYOUT
               ========================================= */}
            <div className="flex md:hidden w-full items-center justify-between">
              <Link to="/" className="flex items-center">
                <img 
                  src="/logo.png" 
                  alt="TrustBridge Logo" 
                  className="h-7 w-auto object-contain"
                />
              </Link>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-50"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-3 rounded-lg text-base font-medium ${
                    isActive(link.path)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              <button
                onClick={() => {
                  setIsConsentManagerOpen(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center w-full px-3 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50"
              >
                <Eye className="h-5 w-5 mr-3" />
                Privacy Settings
              </button>
            </div>
          </div>
        )}
      </nav>

      <ConsentManager
        isOpen={isConsentManagerOpen}
        onClose={() => setIsConsentManagerOpen(false)}
        onConsentChange={(consentId, granted) => {
          console.log(`Consent ${consentId} ${granted ? 'granted' : 'revoked'}`);
        }}
      />
    </>
  );
};

export default Navigation;