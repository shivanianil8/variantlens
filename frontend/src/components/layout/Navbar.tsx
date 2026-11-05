import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Dna,
  Search,
  Box,
  BrainCircuit,
  BookOpen,
  Info,
  Server
} from 'lucide-react';
import { SystemHealth } from '../../types/variant';

interface NavbarProps {
  health: SystemHealth | null;
  healthLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ health, healthLoading }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: Dna },
    { to: '/explorer', label: 'Variant Explorer', icon: Search },
    { to: '/protein-3d', label: '3D Protein Viewer', icon: Box },
    { to: '/prediction', label: 'Prediction & Explainability', icon: BrainCircuit },
    { to: '/evidence', label: 'Evidence & Literature', icon: BookOpen },
    { to: '/about-model', label: 'About the Model', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 bg-navy-900/90 backdrop-blur-md border-b border-navy-750">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
              <Dna className="w-5 h-5 text-accent-cyan group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                  Variant<span className="text-accent-cyan">Lens</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-medium">
                  v0.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-sans">
                Explainable Genetic Variant Explorer
              </p>
            </div>
          </NavLink>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-navy-800 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                        : 'text-slate-300 hover:text-white hover:bg-navy-800/60'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Backend Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-navy-800/80 border border-navy-700 text-xs">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-mono text-[11px]">API:</span>
              {healthLoading ? (
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-ping" />
              ) : health?.status === 'healthy' ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[11px] font-mono text-rose-400">Connecting</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Scroll */}
      <div className="xl:hidden flex items-center space-x-2 px-4 py-2 bg-navy-950/80 border-t border-navy-800 overflow-x-auto text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-navy-800 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};
