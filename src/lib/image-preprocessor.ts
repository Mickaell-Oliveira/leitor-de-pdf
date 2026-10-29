/**
 * Processador de imagem em Canvas para remoção de marcas d'água e aumento de contraste.
 * Especializado em extratos bancários (ex: Banco do Brasil) com fundos acinzentados, amarelos ou azuis.
 */

export interface PreprocessOptions {
  threshold: number; // Valor de 0 a 255 (padrão 165)
  contrastBoost?: boolean; // Reforçar traços dos números e letras
}

/**
 * Aplica binarização / thresholding adaptado no ImageData de um canvas.
 * Pixels mais claros que o threshold (marcas d'água, sombras, fundos) viram branco puro (255).
 * Pixels escuros (textos, tabelas, números) são reforçados para preto puro ou tom bem escuro.
 */
export function applyThresholdToImageData(
  imageData: ImageData,
  threshold: number = 165,
  contrastBoost: boolean = true
): ImageData {
  const data = imageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Se o pixel for transparente, transforma em branco
    if (a < 128) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
      continue;
    }

    // Luminância percebida (ITU-R BT.601)
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Detecta marcas d'água coloridas típicas (ex: amarelos ou azuis suaves do BB)
    // Cores claras e saturadas com luminância moderada ainda pertencem ao fundo
    const isWatermarkTint = (r > 180 && g > 180 && b < 160) || // Amarelado
                            (b > 180 && r < 190 && g < 190);   // Azulado claro

    if (luminance >= threshold || (isWatermarkTint && luminance > 130)) {
      // Fundo limpo / marca d'água eliminada
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    } else {
      // Texto preservado com alto contraste
      if (contrastBoost) {
        // Escurecimento forte para facilitar a leitura por OCR
        const darkened = Math.max(0, Math.floor((luminance / threshold) * 50));
        data[i] = darkened;
        data[i + 1] = darkened;
        data[i + 2] = darkened;
      } else {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }
  }

  return imageData;
}

/**
 * Clona e processa um canvas aplicando a remoção de marca d'água
 */
export function getCleanCanvas(
  sourceCanvas: HTMLCanvasElement,
  threshold: number = 165
): HTMLCanvasElement {
  const cleanCanvas = document.createElement('canvas');
  cleanCanvas.width = sourceCanvas.width;
  cleanCanvas.height = sourceCanvas.height;

  const ctx = cleanCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, cleanCanvas.width, cleanCanvas.height);
  applyThresholdToImageData(imageData, threshold, true);
  ctx.putImageData(imageData, 0, 0);

  return cleanCanvas;
}
