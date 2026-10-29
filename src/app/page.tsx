'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Dropzone } from '@/components/Dropzone';
import { ProcessingStatus } from '@/components/ProcessingStatus';
import { generateOcrSearchablePdf } from '@/lib/ocr-pdf-generator';

const DEFAULT_THRESHOLD = 165;

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resultPdfBlobUrl, setResultPdfBlobUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setResultPdfBlobUrl(null);
    setExtractedText('');
    setErrorMessage(null);
    setProgressPercent(0);
  };

  const handleProcessPdf = async () => {
    if (!selectedFile) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setResultPdfBlobUrl(null);
      setExtractedText('');

      const arrayBuffer = await selectedFile.arrayBuffer();
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');

      setProcessingStatus('Iniciando limpeza e reconhecimento de texto...');
      const result = await generateOcrSearchablePdf(arrayBuffer, DEFAULT_THRESHOLD, (p) => {
        setProcessingStatus(p.status);
        if (p.percent !== undefined) setProgressPercent(p.percent);
      });

      const blob = new Blob([result.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultPdfBlobUrl(url);
      setResultFileName(`${baseName}_limpo_editavel.pdf`);
      setExtractedText(result.extractedFullText);
      setProcessingStatus('PDF editável concluído com sucesso!');
      setProgressPercent(100);
    } catch (err: unknown) {
      console.error('Erro no processamento do PDF:', err);
      setErrorMessage(
        (err as Error)?.message ||
          'Ocorreu um erro ao processar o extrato. Verifique se o arquivo está protegido por senha ou corrompido.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResultPdfBlobUrl(null);
    setExtractedText('');
    setErrorMessage(null);
    setProgressPercent(0);
    setProcessingStatus('');
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Limpador de Extratos PDF
              </h1>
              <p className="text-xs text-slate-500">
                Remoção de marca d&apos;água e conversão em PDF editável
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Upload do Arquivo */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">
              Selecione o Extrato
            </h2>
            {selectedFile && !isProcessing && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-rose-600 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trocar arquivo</span>
              </button>
            )}
          </div>

          <Dropzone
            onFileSelected={handleFileSelected}
            selectedFile={selectedFile}
            disabled={isProcessing}
          />
        </section>

        {/* Botão de Ação Direto */}
        {selectedFile && !resultPdfBlobUrl && !isProcessing && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleProcessPdf}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Limpar Marca d&apos;Água e Gerar PDF Editável</span>
            </button>
          </div>
        )}

        {/* Status de Processamento */}
        {isProcessing && (
          <section>
            <ProcessingStatus
              status={processingStatus}
              percent={progressPercent}
              isComplete={false}
            />
          </section>
        )}

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold">Erro no processamento:</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Resultado: Download do PDF Limpo */}
        {resultPdfBlobUrl && (
          <section className="bg-white rounded-2xl border-2 border-emerald-400 p-6 shadow-md space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    PDF Pronto para Download!
                  </h3>
                  <p className="text-sm text-slate-500">{resultFileName}</p>
                </div>
              </div>

              <a
                href={resultPdfBlobUrl}
                download={resultFileName}
                className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition text-base"
              >
                <Download className="w-5 h-5" />
                <span>Baixar PDF Pronto</span>
              </a>
            </div>

            {/* Texto extraído para conferência rápida */}
            {extractedText && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Conferir Texto Extraído do Extrato:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="inline-flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-lg border border-blue-200"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Tudo</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed select-all">
                  {extractedText}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-800 underline"
              >
                Limpar outro extrato
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>Limpador de Extratos PDF</p>
      </footer>
    </div>
  );
}
