import React from 'react';
import { Link } from 'wouter';
import { Satellite, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center animate-pulse">
        <Satellite size={32} />
      </div>
      <h1 className="text-4xl font-black font-mono text-[hsl(var(--foreground))]">404</h1>
      <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Logistics Telemetry Node Not Found</h2>
      <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">
        The requested GIS corridor, district dashboard, or route record does not exist in the active regional registry.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
      >
        <ArrowLeft size={14} />
        <span>Return to Command Center</span>
      </Link>
    </div>
  );
}
