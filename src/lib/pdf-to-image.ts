const MAX_RENDER_DIMENSION = 1600;

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('No se pudo crear una imagen a partir del PDF.'));
    }, type, quality);
  });

export const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export const convertPdfFirstPageToImage = async (file: File): Promise<File> => {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);

  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;

  const loadingTask = pdfjs.getDocument({
    data: await file.arrayBuffer(),
    isEvalSupported: false,
  });

  let pdfDocument: Awaited<typeof loadingTask.promise> | null = null;

  try {
    pdfDocument = await loadingTask.promise;

    if (pdfDocument.numPages < 1) {
      throw new Error('El PDF no contiene páginas para convertir.');
    }

    const page = await pdfDocument.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(
      2,
      MAX_RENDER_DIMENSION / Math.max(baseViewport.width, baseViewport.height)
    );
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      throw new Error('El navegador no pudo preparar la conversión del PDF.');
    }

    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));

    await page.render({
      canvasContext: context,
      viewport,
      background: '#ffffff',
    }).promise;

    let blob: Blob;
    let extension: 'webp' | 'png' = 'webp';

    try {
      blob = await canvasToBlob(canvas, 'image/webp', 0.92);
    } catch {
      blob = await canvasToBlob(canvas, 'image/png');
      extension = 'png';
    }

    canvas.width = 1;
    canvas.height = 1;

    const baseName = file.name.replace(/\.pdf$/i, '') || 'patrocinador';
    return new File([blob], `${baseName}-pagina-1.${extension}`, {
      type: blob.type,
      lastModified: file.lastModified,
    });
  } finally {
    if (pdfDocument) {
      await pdfDocument.destroy();
    } else {
      await loadingTask.destroy();
    }
  }
};
