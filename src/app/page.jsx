"use client";

import dynamic from 'next/dynamic';

// Carregando o App principal do lado do cliente (SPA) para não quebrar o Vite State Management
const ClientApp = dynamic(() => import('../App.jsx'), { ssr: false });

export default function Page() {
  return <ClientApp />;
}
