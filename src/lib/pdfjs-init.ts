/**
 * Inicializador seguro do PDF.js para navegadores (Next.js Client Components)
 */
let pdfjsLibInstance: typeof import('pdfjs-dist') | null = null;

export async function getPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js só pode ser executado no navegador.');
  }

  if (pdfjsLibInstance) {
    return pdfjsLibInstance;
  }

  const pdfjs = await import('pdfjs-dist');
  
  // Define o worker via CDN seguro unpkg com a versão correspondente
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    const version = pdfjs.version || '3.11.174';
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
  }

  pdfjsLibInstance = pdfjs;
  return pdfjs;
}
