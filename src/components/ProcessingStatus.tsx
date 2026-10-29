'use client';

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ProcessingStatusProps {
  status: string;
  percent?: number;
  isComplete?: boolean;
}

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  status,
  percent = 0,
  isComplete = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center space-x-3">
        {isComplete ? (
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-base truncate">
            {isComplete ? 'Processamento Concluído com Sucesso!' : 'Processando Extrato...'}
          </p>
          <p className="text-sm text-slate-500 truncate">{status}</p>
        </div>
        {percent !== undefined && (
          <span className="font-bold text-slate-700 text-sm">{Math.min(100, Math.max(0, percent))}%</span>
        )}
      </div>

      {/* Barra de Progresso */}
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isComplete ? 'bg-emerald-500' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
};
