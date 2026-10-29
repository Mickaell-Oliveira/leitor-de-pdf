import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getPdfJs } from './pdfjs-init';

export interface CleanDigitalPdfProgress {
  currentPage: number;
  totalPages: number;
  status: string;
}

/**
 * Filtra e sanitiza textos para a codificação padrão WinAnsi do pdf-lib (Helvetica)
 */
function sanitizeTextForStandardFont(text: string): string {
  // Substitui caracteres invisíveis ou incompatíveis com a fonte padrão
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

/**
 * Modo Digital: Extrai o texto exato do PDF original mantendo as coordenadas (x, y)
 * e recria um PDF limpo do zero, sem imagens, fundos ou marcas d'água.
 */
export async function cleanDigitalPdf(
  fileBuffer: ArrayBuffer,
  onProgress?: (progress: CleanDigitalPdfProgress) => void
): Promise<{ pdfBytes: Uint8Array; extractedTextCount: number }> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({ data: fileBuffer });
  const originalPdf = await loadingTask.promise;
  const totalPages = originalPdf.numPages;

  // Cria um novo documento limpo com pdf-lib
  const newPdfDoc = await PDFDocument.create();
  const helveticaFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);

  let totalItemsExtracted = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      currentPage: pageNum,
      totalPages,
      status: `Limpando página ${pageNum} de ${totalPages} (Modo Digital Direto)...`,
    });

    const page = await originalPdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    // Nova página limpa nas mesmas dimensões do original
    const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);

    // Extrai o conteúdo textual nativo
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;

      totalItemsExtracted++;
      const textItem = item as {
        str: string;
        transform: number[];
        fontName?: string;
        width?: number;
      };

      // Cálculo de tamanho da fonte a partir da matriz de transformação de escala
      const scaleX = item.transform[0];
      const scaleY = item.transform[3];
      const calculatedFontSize = Math.max(6, Math.min(36, Math.round(Math.hypot(scaleX, scaleY))));

      const x = item.transform[4];
      const y = item.transform[5];

      // Detecta se a fonte original era negrito pelo nome
      const isBold = textItem.fontName?.toLowerCase().includes('bold') || false;
      const selectedFont = isBold ? helveticaBold : helveticaFont;

      const cleanStr = sanitizeTextForStandardFont(textItem.str);
      if (!cleanStr.trim()) continue;

      try {
        newPage.drawText(cleanStr, {
          x: Math.max(0, Math.min(x, viewport.width - 10)),
          y: Math.max(0, Math.min(y, viewport.height - 10)),
          size: calculatedFontSize,
          font: selectedFont,
          color: rgb(0.05, 0.05, 0.05), // Preto suave nítido
        });
      } catch {
        // Fallback seguro caso algum caractere falhe na renderização
        try {
          newPage.drawText(cleanStr.replace(/[^a-zA-Z0-9.,;:/\-–+*=$%() ]/g, ' '), {
            x: Math.max(0, x),
            y: Math.max(0, y),
            size: calculatedFontSize,
            font: helveticaFont,
            color: rgb(0.1, 0.1, 0.1),
          });
        } catch {
          // Ignora item que não puder ser desenhado
        }
      }
    }
  }

  const pdfBytes = await newPdfDoc.save();
  return { pdfBytes, extractedTextCount: totalItemsExtracted };
}
