# Limpador e Conversor de Extratos PDF (`leitor-de-pdf`)

Aplicação web desenvolvida especialmente para contadores e administradores que precisam extrair dados de extratos bancários em PDF (como **Banco do Brasil**, Itaú, Bradesco, Santander, etc.) sem interferência de **marcas d'água de fundo**.

## 🚀 Como Funciona

- **Remoção de Marca d'Água por Limiarização / Threshold**: O Banco do Brasil insere um brasão ou logotipo claro de fundo que interfere no iLovePDF e outros sistemas. O algoritmo analisa a luminância de cada pixel e transforma qualquer traço claro/amarelo/cinza em branco puro antes da leitura.
- **Prévia Interativa da 1ª Página**: Um controle deslizante permite que a usuária veja a marca d'água sumindo em tempo real e os números ficando super nítidos.
- **Modo Duplo Inteligente**:
  - **Modo 1 (Recomendado) — Limpar Fundo + OCR**: Renderiza em alta resolução (300 DPI), limpa a imagem e aplica Tesseract.js em Português com camada de texto 100% selecionável nas coordenadas exatas.
  - **Modo 2 — Limpeza Rápida Digital**: Para extratos já digitais, apaga todas as imagens de fundo e recria um PDF vetorial com os dados nas mesmas posições em menos de 2 segundos.
- **100% Seguro e Privado**: Todo o processamento ocorre no próprio navegador da usuária (Client-Side com WebAssembly/Canvas). Nenhum extrato bancário é enviado para servidores externos.

---

## 🛠️ Tecnologias Utilizadas

- **Next.js 14 (App Router)** + **TypeScript**
- **Tailwind CSS** + **Lucide Icons**
- **pdfjs-dist** (Leitura de objetos e renderização no Canvas)
- **pdf-lib** (Geração e manipulação de novos PDFs limpos)
- **tesseract.js** (OCR em Português para geração de PDFs pesquisáveis)

---

## 💻 Como Rodar Localmente

1. Entre na pasta do projeto:
   ```bash
   cd leitor-de-pdf
   ```

2. Instale as dependências (se ainda não tiver instalado):
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra no navegador: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Como Fazer o Deploy na Vercel (Gratuito)

1. Suba esta pasta para um repositório no **GitHub** (ex: `https://github.com/seu-usuario/leitor-de-pdf`).
2. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
3. Clique em **"Add New Project"** e selecione o repositório `leitor-de-pdf`.
4. Deixe as opções padrão do Next.js e clique em **Deploy**.
5. Em menos de 1 minuto o link público estará pronto para você enviar no WhatsApp da sua sogra e validar!
