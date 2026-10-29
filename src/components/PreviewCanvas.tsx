'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eye, Sliders, RefreshCw, ZoomIn, Sparkles } from 'lucide-react';
import { getPdfJs } from '@/lib/pdfjs-init';
import { applyThresholdToImageData } from '@/lib/image-preprocessor';

interface PreviewCanvasProps {
  file: File;
  threshold: number;
  onThresholdChange: (newThreshold: number) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  file,
  threshold,
  onThresholdChange,
}) => {
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'clean' | 'original' | 'split'>('clean');
  const [error, setError] = useState<string | null>(null);

  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Renderiza a primeira página no canvas original escondido
  useEffect(() => {
    let isCancelled = false;

    const renderFirstPage = async () => {
      try {
        setLoading(true);
        setError(null);

        const pdfjs = await getPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (isCancelled) return;
        setTotalPages(pdf.numPages);

        const page = await pdf.getPage(1);
        // Escala para preview rápido e nítido
        const viewport = page.getViewport({ scale: 1.5 });

        // Canvas temporário para guardar a imagem original da página 1
        const origCanvas = document.createElement('canvas');
        origCanvas.width = viewport.width;
        origCanvas.height = viewport.height;
        const ctx = origCanvas.getContext('2d');
        if (!ctx) throw new Error('Falha ao obter contexto 2D');

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        if (isCancelled) return;
        originalCanvasRef.current = origCanvas;
        setLoading(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          setError((err as Error)?.message || 'Erro ao carregar preview do PDF');
          setLoading(false);
        }
      }
    };

    renderFirstPage();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Atualiza o display canvas quando o threshold ou viewMode mudar
  useEffect(() => {
    const origCanvas = originalCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!origCanvas || !displayCanvas || loading) return;

    displayCanvas.width = origCanvas.width;
    displayCanvas.height = origCanvas.height;
    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    if (viewMode === 'original') {
      ctx.drawImage(origCanvas, 0, 0);
    } else if (viewMode === 'clean') {
      // Clona imageData do original e aplica threshold
      const origCtx = origCanvas.getContext('2d');
      if (!origCtx) return;
      const imageData = origCtx.getImageData(0, 0, origCanvas.width, origCanvas.height);
      applyThresholdToImageData(imageData, threshold, true);
      ctx.putImageData(imageData, 0, 0);
    } else if (viewMode === 'split') {
      // Metade esquerda: original | Metade direita: limpo
      const halfWidth = Math.floor(origCanvas.width / 2);
      ctx.drawImage(origCanvas, 0, 0);

      const origCtx = origCanvas.getContext('2d');
      if (!origCtx) return;
      const rightImageData = origCtx.getImageData(halfWidth, 0, origCanvas.width - halfWidth, origCanvas.height);
      applyThresholdToImageData(rightImageData, threshold, true);
      ctx.putImageData(rightImageData, halfWidth, 0);

      // Linha divisória
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(halfWidth, 0);
      ctx.lineTo(halfWidth, origCanvas.height);
      ctx.stroke();
    }
  }, [threshold, viewMode, loading]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-800 text-lg">
              Ajuste de Limpeza de Fundo (Prévia da Página 1)
            </h3>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            O extrato possui {totalPages} {totalPages === 1 ? 'página' : 'páginas'}. Ajuste abaixo se a marca d&apos;água ainda aparecer.
          </p>
        </div>

        {/* Alternador de visualização */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setViewMode('clean')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'clean' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Sem Marca d&apos;Água
          </button>
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'split' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Dividir Tela
          </button>
          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'original' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Original
          </button>
        </div>
      </div>

      {/* Slider de Threshold */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="threshold-slider" className="font-medium text-slate-700 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <span>Intensidade da Remoção do Fundo:</span>
            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {threshold}
            </span>
          </label>
          <button
            type="button"
            onClick={() => onThresholdChange(165)}
            className="text-xs text-slate-500 hover:text-blue-600 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Redefinir (165)</span>
          </button>
        </div>

        <input
          id="threshold-slider"
          type="range"
          min={100}
          max={230}
          step={5}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />

        <div className="flex justify-between text-xs text-slate-400">
          <span>Mais suave (mantém detalhes leves)</span>
          <span>Mais forte (apaga qualquer marca clara)</span>
        </div>
      </div>

      {/* Área da tela do Canvas */}
      <div className="relative min-h-[350px] max-h-[500px] overflow-auto bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center p-4">
        {loading && (
          <div className="flex flex-col items-center space-y-3 text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Carregando visualização do extrato...</p>
          </div>
        )}

        {error && (
          <div className="text-center p-4 text-rose-600 text-sm">
            <p className="font-semibold">Não foi possível gerar a prévia:</p>
            <p>{error}</p>
          </div>
        )}

        <canvas
          ref={displayCanvasRef}
          className={`max-w-full h-auto shadow-md rounded bg-white transition-opacity ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
        />
      </div>
    </div>
  );
};
