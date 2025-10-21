import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/classify', label: 'Classification' },
    { path: '/live-data', label: 'Live Data' },
    { path: '/analysis', label: 'Analysis' },
    { path: '/prediction', label: 'Prediction' },
    { path: '/map', label: 'Map' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white ${
        isScrolled ? 'bg-background/95 backdrop-blur-md shadow-soft' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            {/* <div className="p-2 bg-gradient-water rounded-lg shadow-medium group-hover:scale-110 transition-transform duration-300"> */}
              <img 
                src="/logo.png" 
                alt="AquaMetrics Logo" 
                className="h-10 w-10"
              />
            {/* </div> */}
            <span className="text-xl font-bold bg-gradient-water bg-clip-text text-transparent">
              AquaMetrics
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}>
                <Button
                  variant={isActive(link.path) ? 'default' : 'ghost'}
                  className={`transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-gradient-water text-primary-foreground shadow-soft'
                      : 'hover:bg-primary/10'
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden py-4 animate-fade-in border-t border-border">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button
                  variant={isActive(link.path) ? 'default' : 'ghost'}
                  className={`w-full justify-start mb-1 ${
                    isActive(link.path)
                      ? 'bg-gradient-water text-primary-foreground'
                      : ''
                  }`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
