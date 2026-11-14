import * as THREE from 'three';

export interface ProceduralTextureSet {
  stoneMap: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  goldMarbleMap: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  cobbleMap: THREE.CanvasTexture;
  brassBrushMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Warm carved stone masonry
  const [stoneCanvas, sCtx] = makeCanvas(256);
  sCtx.fillStyle = '#c8bca6';
  sCtx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const rowH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 32;
    for (let c = -1; c < 5; c++) {
      const x = c * 64 + offset;
      const y = r * rowH;
      const shade = 185 + ((r * 17 + c * 31) % 28) - 14;
      sCtx.fillStyle = `rgb(${shade + 10}, ${shade}, ${shade - 18})`;
      sCtx.fillRect(x + 2, y + 2, 60, rowH - 4);
      sCtx.strokeStyle = 'rgba(82, 68, 52, 0.35)';
      sCtx.lineWidth = 2;
      sCtx.strokeRect(x + 1, y + 1, 62, rowH - 2);
    }
  }
  // Subtle stone speckle
  for (let i = 0; i < 650; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    sCtx.fillStyle = i % 2 === 0 ? 'rgba(255,250,240,0.12)' : 'rgba(60,50,40,0.1)';
    sCtx.fillRect(x, y, 2, 2);
  }
  const stoneMap = new THREE.CanvasTexture(stoneCanvas);
  stoneMap.colorSpace = THREE.SRGBColorSpace;
  stoneMap.wrapS = THREE.RepeatWrapping;
  stoneMap.wrapT = THREE.RepeatWrapping;
  stoneMap.anisotropy = maxAnisotropy;

  // Stone bump map (linear)
  const [bumpCanvas, bCtx] = makeCanvas(256);
  bCtx.fillStyle = '#999999';
  bCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 32;
    for (let c = -1; c < 5; c++) {
      const x = c * 64 + offset;
      const y = r * rowH;
      bCtx.fillStyle = '#d4d4d4';
      bCtx.fillRect(x + 3, y + 3, 58, rowH - 6);
    }
  }
  const stoneBump = new THREE.CanvasTexture(bumpCanvas);
  stoneBump.wrapS = THREE.RepeatWrapping;
  stoneBump.wrapT = THREE.RepeatWrapping;
  stoneBump.anisotropy = maxAnisotropy;

  // 2. Golden Bastion marble map
  const [goldCanvas, gCtx] = makeCanvas(256);
  gCtx.fillStyle = '#efe6d0';
  gCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 32;
    for (let c = -1; c < 5; c++) {
      const x = c * 64 + offset;
      const y = r * rowH;
      gCtx.fillStyle = (r + c) % 2 === 0 ? '#f6ebd2' : '#eadbb9';
      gCtx.fillRect(x + 2, y + 2, 60, rowH - 4);
      gCtx.strokeStyle = 'rgba(212, 162, 56, 0.55)';
      gCtx.lineWidth = 2;
      gCtx.strokeRect(x + 1, y + 1, 62, rowH - 2);
    }
  }
  const goldMarbleMap = new THREE.CanvasTexture(goldCanvas);
  goldMarbleMap.colorSpace = THREE.SRGBColorSpace;
  goldMarbleMap.wrapS = THREE.RepeatWrapping;
  goldMarbleMap.wrapT = THREE.RepeatWrapping;
  goldMarbleMap.anisotropy = maxAnisotropy;

  // 3. Oak wood grain
  const [woodCanvas, wCtx] = makeCanvas(128);
  wCtx.fillStyle = '#b97a42';
  wCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 3) {
    const alpha = 0.08 + ((y * 19) % 10) * 0.012;
    wCtx.fillStyle = y % 6 === 0 ? `rgba(74, 42, 16, ${alpha})` : `rgba(225, 175, 115, ${alpha})`;
    wCtx.fillRect(0, y, 128, 2);
  }
  const woodMap = new THREE.CanvasTexture(woodCanvas);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.wrapS = THREE.RepeatWrapping;
  woodMap.wrapT = THREE.RepeatWrapping;
  woodMap.anisotropy = maxAnisotropy;

  // 4. Cobblestone path
  const [cobbleCanvas, cCtx] = makeCanvas(256);
  cCtx.fillStyle = '#5c554c';
  cCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const jitterX = ((r * 13 + c * 7) % 7) - 3;
      const jitterY = ((r * 11 + c * 17) % 7) - 3;
      const l = 115 + ((r * 23 + c * 19) % 30);
      cCtx.fillStyle = `rgb(${l + 6}, ${l}, ${l - 8})`;
      cCtx.beginPath();
      cCtx.roundRect(c * 32 + 3 + jitterX, r * 32 + 3 + jitterY, 25, 25, 6);
      cCtx.fill();
    }
  }
  const cobbleMap = new THREE.CanvasTexture(cobbleCanvas);
  cobbleMap.colorSpace = THREE.SRGBColorSpace;
  cobbleMap.wrapS = THREE.RepeatWrapping;
  cobbleMap.wrapT = THREE.RepeatWrapping;
  cobbleMap.repeat.set(2, 6);
  cobbleMap.anisotropy = maxAnisotropy;

  // 5. Brushed brass roughness/detail
  const [brassCanvas, brCtx] = makeCanvas(128);
  brCtx.fillStyle = '#d4a348';
  brCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    brCtx.fillStyle = i % 4 === 0 ? 'rgba(255,240,190,0.14)' : 'rgba(90,60,15,0.1)';
    brCtx.fillRect(0, i, 128, 1);
  }
  const brassBrushMap = new THREE.CanvasTexture(brassCanvas);
  brassBrushMap.colorSpace = THREE.SRGBColorSpace;
  brassBrushMap.wrapS = THREE.RepeatWrapping;
  brassBrushMap.wrapT = THREE.RepeatWrapping;
  brassBrushMap.anisotropy = maxAnisotropy;

  // 6. Soft radial contact shadow
  const [shCanvas, shCtx] = makeCanvas(128);
  const grad = shCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 12, 18, 0.55)');
  grad.addColorStop(0.55, 'rgba(10, 12, 18, 0.22)');
  grad.addColorStop(1, 'rgba(10, 12, 18, 0.0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shCanvas);

  return {
    stoneMap,
    stoneBump,
    goldMarbleMap,
    woodMap,
    cobbleMap,
    brassBrushMap,
    contactShadowMap,
    dispose: () => {
      stoneMap.dispose();
      stoneBump.dispose();
      goldMarbleMap.dispose();
      woodMap.dispose();
      cobbleMap.dispose();
      brassBrushMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
