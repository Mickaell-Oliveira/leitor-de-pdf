import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createWorker } from 'tesseract.js';
import { getPdfJs } from './pdfjs-init';
import { getCleanCanvas } from './image-preprocessor';

export interface OcrProgress {
  currentPage: number;
  totalPages: number;
  stage: 'rendering' | 'cleaning' | 'ocr' | 'generating';
  status: string;
  percent?: number;
}

/**
 * Converte um Canvas HTML em Uint8Array (PNG) para inclusão no PDF
 */
async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Erro ao converter canvas para blob PNG.'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Filtra e sanitiza textos para a fonte padrão do PDF
 */
function sanitizeText(text: string): string {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').trim();
}

/**
 * Pipeline completo de Limpeza + OCR Searchable PDF:
 * 1. Renderiza cada página do PDF em 300 DPI (escala 2.5 ~ 3.0).
 * 2. Remove as marcas d'água e ruídos pelo filtro de luminância.
 * 3. Aplica Tesseract OCR em Português na imagem binarizada.
 * 4. Gera novo documento PDF com a imagem limpa e camada de texto selecionável nas posições exatas.
 */
export async function generateOcrSearchablePdf(
  fileBuffer: ArrayBuffer,
  threshold: number = 165,
  onProgress?: (progress: OcrProgress) => void
): Promise<{ pdfBytes: Uint8Array; extractedFullText: string }> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: fileBuffer });
  const originalPdf = await loadingTask.promise;
  const totalPages = originalPdf.numPages;

  onProgress?.({
    currentPage: 0,
    totalPages,
    stage: 'ocr',
    status: 'Inicializando motor OCR de reconhecimento de texto...',
    percent: 5,
  });

  // Inicializa o worker do Tesseract em Português
  const worker = await createWorker('por');

  const newPdfDoc = await PDFDocument.create();
  const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);
  let extractedFullText = '';

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageBasePercent = Math.round(((pageNum - 1) / totalPages) * 90);

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'rendering',
        status: `Renderizando página ${pageNum} de ${totalPages} em alta resolução...`,
        percent: pageBasePercent + 5,
      });

      const page = await originalPdf.getPage(pageNum);
      // Escala 2.5 garante altíssima nitidez para o OCR sem sobrecarregar a memória
      const scale = 2.5;
      const viewport = page.getViewport({ scale });

      // Canvas original
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = viewport.width;
      sourceCanvas.height = viewport.height;
      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível obter contexto 2D do Canvas.');

      // Renderiza página original no canvas
      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'cleaning',
        status: `Removendo marca d'água da página ${pageNum}...`,
        percent: pageBasePercent + 12,
      });

      // Aplica remoção de marca d'água
      const cleanCanvas = getCleanCanvas(sourceCanvas, threshold);

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'ocr',
        status: `Reconhecendo textos e tabelas da página ${pageNum} com OCR...`,
        percent: pageBasePercent + 18,
      });

      // Executa OCR na imagem limpa
      const ocrResult = await worker.recognize(cleanCanvas);
      extractedFullText += `--- PÁGINA ${pageNum} ---\n` + ocrResult.data.text + '\n\n';

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        stage: 'generating',
        status: `Gerando página ${pageNum} no novo PDF pesquisável...`,
        percent: pageBasePercent + 25,
      });

      // Dimensões originais do PDF em pontos (72 DPI padrão PDF)
      const originalViewport = page.getViewport({ scale: 1.0 });
      const pageWidth = originalViewport.width;
      const pageHeight = originalViewport.height;

      const newPage = newPdfDoc.addPage([pageWidth, pageHeight]);

      // Converte o canvas limpo para PNG e incorpora na página
      const pngBytes = await canvasToPngBytes(cleanCanvas);
      const embeddedImage = await newPdfDoc.embedPng(pngBytes);

      // Desenha a imagem limpa como base da página
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
      });

      // Sobrepõe as palavras reconhecidas em suas coordenadas exatas
      // com opacidade 0 (invisível) para que o texto seja selecionável e copiado pelo sistema
      const words = ocrResult.data.words || [];
      const canvasWidth = cleanCanvas.width;
      const canvasHeight = cleanCanvas.height;

      for (const word of words) {
        const cleanWordText = sanitizeText(word.text);
        if (!cleanWordText) continue;

        const { x0, y0, y1 } = word.bbox;

        // Conversão de coordenadas (Canvas topo-esquerdo para PDF base-esquerda)
        const pdfX = (x0 / canvasWidth) * pageWidth;
        const pdfY = ((canvasHeight - y1) / canvasHeight) * pageHeight;
        const wordBoxHeight = ((y1 - y0) / canvasHeight) * pageHeight;
        const fontSize = Math.max(5, Math.min(28, wordBoxHeight * 0.85));

        try {
          newPage.drawText(cleanWordText, {
            x: Math.max(0, Math.min(pdfX, pageWidth - 10)),
            y: Math.max(0, Math.min(pdfY, pageHeight - 10)),
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
            opacity: 0.0, // Camada invisível de texto perfeito para busca/extração
          });
        } catch {
          // Ignora caractere não mapeado no fallback
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    stage: 'generating',
    status: 'Finalizando e compactando novo PDF limpo...',
    percent: 100,
  });

  const pdfBytes = await newPdfDoc.save();
  return { pdfBytes, extractedFullText };
}
