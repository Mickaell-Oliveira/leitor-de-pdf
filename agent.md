# Especificação Técnica e Guia de Implementação — Limpador e Conversor de Extratos PDF (`leitor-de-pdf`)

## 1. Contexto e Objetivo do Produto
A usuária final (contadora/administradora) recebe extratos bancários em PDF (como os do **Banco do Brasil**) e precisa importá-los em outro sistema que extrai dados a partir do texto selecionável do PDF.
**O Problema Atual:** Ferramentas tradicionais de OCR (como o *iLovePDF*) falham em extratos do Banco do Brasil porque a **marca d'água de fundo** (brasão/logotipo cinza claro ou colorido atravessando os números) interfere na leitura dos caracteres ou porque a camada vetorial da marca d'água se mistura com o texto no fluxo de objetos do PDF.
**A Solução:** Uma aplicação web ultra-simples (foco em MVP/Validação na Vercel) que recebe o PDF original, remove a marca d'água (via limpeza de objetos vetoriais ou pré-processamento de imagem com *thresholding*/binarização agressiva) e devolve um **PDF limpo e 100% selecionável/pesquisável (Searchable PDF)** mantendo o layout posicional para que o software subsequente consiga importar os dados sem erros.

---

## 2. Arquitetura e Stack Tecnológica (Foco em Deploy na Vercel)

Como o objetivo é hospedar na **Vercel (plano Hobby/Gratuito)** da forma mais simples possível, temos duas restrições importantes da Vercel Serverless:
1. Limite de tamanho de payload em Serverless Functions (4.5 MB) e tempo de execução (10s a 60s).
2. Binários pesados em C/C++ (como Tesseract nativo ou Ghostscript) são difíceis de empacotar em funções Serverless Node.js.

Por isso, a arquitetura escolhida é **100% Client-Side Processing (WebAssembly / Canvas no navegador) com Next.js App Router**, ou híbrida leve:
- **Zero custo de servidor / Sem limite de timeout da Vercel**: Todo o processamento de imagem e PDF roda no navegador do cliente.
- **Privacidade Bancária**: Os extratos dos clientes nem precisam sair do computador da usuária (grande diferencial para dados financeiros).

### Stack Recomendada:
- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS (Hospedagem nativa e imediata na Vercel).
- **Renderização e Inspeção do PDF**: `pdfjs-dist` (Mozilla PDF.js) para ler páginas, extrair texto existente ou renderizar páginas em `<canvas>` em alta resolução (300 DPI).
- **Pré-processamento de Imagem (Remoção de Marca d'Água)**: API nativa de `Canvas 2D` (`ImageData`) aplicando filtros matemáticos de **Limiarização (Binarização / Thresholding)** e filtro de luminância.
  - *Por que funciona no Banco do Brasil?* O texto do extrato é preto/cinza-escuro (luminância baixa, ex: RGB < 110), enquanto a marca d'água de fundo é cinza-claro ou amarelo/azul suave (luminância alta, ex: RGB > 160). Ao converter qualquer pixel com luminância > `limiar` para branco puro (`#FFFFFF`) e o restante para preto puro (`#000000`), a marca d'água desaparece completamente antes do OCR!
- **Motor de OCR**: `tesseract.js` (v5+) configurado com o idioma `por` (Português), gerando saída com camada de texto invisível sobre a imagem limpa (`pdf` output nativo do Tesseract.js) **OU** `pdf-lib` para reconstruir o PDF limpo.
- **Modo Duplo Inteligente (Híbrido Vetorial vs. OCR)**:
  1. **Modo 1 — Limpeza + OCR com Camada de Texto (Padrão para PDFs escaneados ou com fonte corrompida):** Renderiza em 300 DPI -> Remove marca d'água no Canvas (Thresholding ajustável) -> Gera PDF Pesquisável via Tesseract.js (`getPDF`).
  2. **Modo 2 — Extração/Reconstrução de Texto Nativo (Para PDFs digitais nativos):** Se o PDF já possui texto digital embutido e o problema no software dela é apenas a marca d'água/imagens atrapalhando ou a necessidade de um PDF limpo só com o texto na posição exata (`x, y`), extrai os itens de texto via `pdfjs-dist` (`page.getTextContent()`) e desenha apenas o texto limpo nas mesmas coordenadas em um novo documento branco com `pdf-lib`.

---

## 3. Requisitos Funcionais da Interface (UX para Usuário Não-Técnico)

A interface deve ser pensada para uma pessoa prática que quer resolver o problema em 2 cliques:
1. **Tela Única (Single Page)**:
   - Área grande de **Arrastar e Soltar (Drag & Drop)** ou botão "Escolher PDF do Extrato".
2. **Seletor de Modo Simples (com padrão já selecionado)**:
   - **Opção A (Recomendada - "Limpar Marca d'Água + OCR")**: Remove o fundo cinza/colorido e refaz a leitura do texto.
   - **Opção B ("Limpeza Rápida de PDF Digital")**: Mantém apenas os textos originais nas posições exatas e apaga todas as imagens/marcas d'água de fundo (instantâneo, leva < 2 segundos).
3. **Controle Visual de Limpeza (Preview em Tempo Real da 1ª Página)**:
   - Mostra lado a lado (ou com toggle) o "Antes" e "Depois (Sem Marca d'Água)".
   - Um controle deslizante simples: **"Intensidade da Remoção do Fundo"** (Threshold de `100` a `220`, padrão `165`). Quando ela mexer, o preview atualiza na hora mostrando a marca d'água sumindo e os números ficando nítidos.
4. **Progresso Claro**:
   - Barra de progresso amigável: *"Limpando página 1 de 5..."*, *"Reconhecendo números e textos..."*.
5. **Download Direto**:
   - Botão grande verde **"Baixar PDF Limpo e Editável"** + opção de copiar o texto/tabela extraída caso ela queira conferir.

---

## 4. Estrutura de Pastas do Projeto

O agente implementador deve criar o projeto dentro desta pasta (`leitor-de-pdf`) com a seguinte estrutura:

```text
leitor-de-pdf/
├── agent.md                  # Este arquivo de especificação
├── package.json
├── next.config.mjs           # Configuração para suportar canvas/pdfjs no client
├── tailwind.config.ts
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx          # Página principal com fluxo passo a passo
    │   └── globals.css
    ├── components/
    │   ├── Dropzone.tsx      # Upload do PDF
    │   ├── PreviewCanvas.tsx # Preview da remoção de marca d'água com slider de threshold
    │   └── ProcessingStatus.tsx
    └── lib/
        ├── pdf-digital-cleaner.ts  # Modo B: Extrai coordenadas de texto com pdfjs e recria PDF limpo com pdf-lib
        ├── image-preprocessor.ts   # Algoritmo de Binarização/Remoção de Marca d'água em Canvas 300 DPI
        └── ocr-pdf-generator.ts    # Modo A: Pipeline PDF -> Imagem Limpa -> Tesseract.js Searchable PDF
```

---

## 5. Detalhamento dos Algoritmos Críticos (Guia para o Implementador)

### 5.1. Algoritmo de Remoção de Marca d'Água (`src/lib/image-preprocessor.ts`)
Para cada página renderizada pelo `pdfjs-dist` com `scale: 3.0` (alta resolução para garantir precisão em fontes pequenas de extratos bancários):
1. Obter `const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);`
2. Percorrer os pixels (`data[i]`, `data[i+1]`, `data[i+2]`):
   ```ts
   // Cálculo de luminância percebida
   const r = data[i];
   const g = data[i + 1];
   const b = data[i + 2];
   const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

   // Além da luminância, marcas d'água coloridas (amarelo/azul do BB) têm saturação ou canais claros
   // Se a luminância for maior que o threshold (ex: 165), vira branco puro (255)
   // Caso contrário, escurecemos proporcionalmente ou binarizamos para preto (0) para máximo contraste no OCR
   if (luminance > threshold) {
     data[i] = 255;
     data[i + 1] = 255;
     data[i + 2] = 255;
   } else {
     // Contraste suave para preservar anti-aliasing das letras sem deixar ruído
     const darkened = Math.max(0, Math.floor((luminance / threshold) * 80));
     data[i] = darkened;
     data[i + 1] = darkened;
     data[i + 2] = darkened;
   }
   ```

### 5.2. Algoritmo de Limpeza Digital Instantânea (`src/lib/pdf-digital-cleaner.ts`)
Muitos extratos baixados diretamente do site/app do Banco do Brasil **já são PDFs digitais** (não são fotos), mas o iLovePDF estraga o arquivo porque tenta aplicar OCR por cima da marca d'água ou o leitor do sistema contábil se perde com os objetos gráficos do fundo.
1. Carregar o PDF com `pdfjs-dist`.
2. Para cada página, chamar `const textContent = await page.getTextContent()`.
3. Criar um novo documento com `PDFDocument.create()` da biblioteca `pdf-lib` com as mesmas dimensões (`width`, `height`) da página original.
4. Incorporar a fonte padrão (`StandardFonts.Helvetica` ou `Courier`).
5. Iterar sobre `textContent.items`:
   - Pegar a string `item.str`, a posição `x = item.transform[4]`, `y = item.transform[5]` e `fontSize = Math.hypot(item.transform[0], item.transform[1])`.
   - Desenhar o texto na nova página limpa do `pdf-lib` nas exatas mesmas coordenadas (`page.drawText(...)`).
6. Resultado: Um PDF **100% vetorial, leve, sem nenhuma imagem ou marca d'água de fundo**, gerado em menos de 1 segundo e com 100% de fidelidade nos números e datas!

### 5.3. Geração do Searchable PDF via OCR (`src/lib/ocr-pdf-generator.ts`)
Caso o extrato seja escaneado/imagem ou o Modo Digital não tenha camada de texto:
1. Usar `tesseract.js` (`createWorker('por')`).
2. Para páginas múltiplas, podemos:
   - Extrair os blocos/palavras com `worker.recognize(cleanCanvasDataUrl)` que retorna `data.words` (cada palavra com `text` e `bbox: { x0, y0, x1, y1 }`).
   - Usar `pdf-lib` para criar a página:
     - Opcionalmente desenhar a imagem limpa de fundo (ou deixar fundo 100% branco) e desenhar o texto selecionável na coordenada exata convertendo o `bbox` da imagem para a escala do PDF.
     - *Dica de Ouro*: Usar `pdf-lib` desenhando a imagem limpa + texto invisível (ou visível nítido) nas coordenadas `bbox` do Tesseract é muito mais estável no navegador e permite juntar múltiplas páginas facilmente num único PDF final!

---

## 6. Passo a Passo de Implementação (Checklist para o Agente)

Quando solicitado a implementar o projeto, siga exatamente esta ordem:

1. **Inicialização**:
   - Inicializar o projeto Next.js na pasta atual (`leitor-de-pdf`) com TypeScript e Tailwind CSS.
   - Instalar dependências: `npm install pdfjs-dist pdf-lib tesseract.js lucide-react`.
2. **Configuração do Next.js (`next.config.mjs`)**:
   - Configurar `webpack` (ou Turbopack alias) com `canvas: false` para que o `pdfjs-dist` funcione perfeitamente no client-side sem erros de build na Vercel.
   - Configurar o worker do `pdfjs-dist` via CDN confiável (`https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`) para evitar problemas de rota estática na Vercel.
3. **Implementação dos Motores (`src/lib/`)**:
   - Implementar primeiro o `pdf-digital-cleaner.ts` (Reconstrução limpa sem marca d'água mantendo coordenadas exatas).
   - Implementar o `image-preprocessor.ts` (Filtro de luminância/threshold no Canvas).
   - Implementar o `ocr-pdf-generator.ts` (Tesseract.js + `pdf-lib` montando o PDF multi-página pesquisável).
4. **Construção da Interface (`src/app/page.tsx` e `src/components/`)**:
   - Interface limpa, em Português, com letras legíveis e botões claros.
   - Implementar o **Preview Interativo**: Ao subir o PDF, renderizar a página 1 imediatamente mostrando como fica sem a marca d'água e permitir ajustar o slider de intensidade se necessário.
   - Permitir testar tanto o **"Modo Digital (Instantâneo - Remove imagens e mantém texto original)"** quanto o **"Modo OCR com Limpeza de Marca d'Água (Para PDFs escaneados/difíceis)"**.
5. **Verificação de Build**:
   - Rodar `npm run build` para garantir que não há erros de TypeScript ou SSR (`window is not defined`) antes do deploy na Vercel.
