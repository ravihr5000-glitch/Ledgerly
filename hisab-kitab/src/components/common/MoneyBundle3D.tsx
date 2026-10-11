import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface MoneyBundle3DProps {
  isMobile?: boolean;
}

export const MoneyBundle3D: React.FC<MoneyBundle3DProps> = ({ isMobile = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Target display dimensions
    // Desktop: 80px x 54px (beside desktop Dashboard header)
    // Mobile: 48px x 32px (compact, fits beside Create Mode button)
    const width = isMobile ? 48 : 80;
    const height = isMobile ? 32 : 54;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    // Camera angle matching reference video: elevated ~20 degrees looking slightly down
    camera.position.set(0, 3.15, 7.3);
    camera.lookAt(0, 0.42, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      stencil: false,
    });
    renderer.setSize(width, height);
    // 4K Ultra-Sharp Rendering: support up to 4x pixel density
    const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
    renderer.setPixelRatio(Math.min(dpr, 4.0));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Style the canvas for crisp subpixel presentation
    renderer.domElement.style.width = `${width}px`;
    renderer.domElement.style.height = `${height}px`;
    renderer.domElement.style.display = 'block';

    container.appendChild(renderer.domElement);

    // 2. Lighting setup
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.55);
    scene.add(ambientLight);

    // Key directional light from top-front
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(4, 7, 5.5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xdcfce7, 1.1);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    // Vibrant Green Neon Point Light under the floating money bundle
    const neonPointLight = new THREE.PointLight(0x22c55e, 5.5, 6.0);
    neonPointLight.position.set(0, 0.35, 0);
    scene.add(neonPointLight);

    // Max Anisotropy for 4K crisp texture rendering at glancing angles
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // -------------------------------------------------------------
    // Ultra-High Resolution Procedural Canvas Textures (2048 x 1280)
    // -------------------------------------------------------------
    // A. Top face ($100 bill front with white currency strap)
    const createTopBillTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d')!;

      // Background currency paper (subtle textured mint green)
      ctx.fillStyle = '#e2f5e7';
      ctx.fillRect(0, 0, 2048, 1280);

      // Micro-texture / banknote paper grain
      ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
      for (let i = 0; i < 2048; i += 6) {
        ctx.fillRect(i, 0, 3, 1280);
      }

      // Fine currency guilloche border
      ctx.strokeStyle = '#046a38';
      ctx.lineWidth = 24;
      ctx.strokeRect(48, 48, 1952, 1184);

      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = 8;
      ctx.strokeRect(72, 72, 1904, 1136);

      // Fine geometric pattern lines inside border
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.3)';
      ctx.lineWidth = 3;
      for (let x = 90; x < 1950; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x + 16, 1200);
        ctx.stroke();
      }

      // Corner numerals "100"
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 144px "Courier New", monospace';
      ctx.fillText('100', 104, 224);
      ctx.fillText('100', 1680, 224);
      ctx.fillText('100', 104, 1140);
      ctx.fillText('100', 1680, 1140);

      // Top banner
      ctx.font = 'bold 64px "Courier New", monospace';
      ctx.fillStyle = '#047857';
      ctx.textAlign = 'center';
      ctx.fillText('FEDERAL RESERVE NOTE', 1024, 168);
      ctx.font = 'bold 72px "Courier New", monospace';
      ctx.fillText('THE UNITED STATES OF AMERICA', 1024, 272);

      // Center portrait medallion / oval
      ctx.beginPath();
      ctx.ellipse(1024, 640, 260, 320, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 12;
      ctx.stroke();

      // Portrait silhouette & shading
      ctx.fillStyle = '#d1fae5';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1024, 580, 136, 168, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#065f46';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(1024, 840, 192, Math.PI * 1.1, Math.PI * 1.9);
      ctx.fill();

      // Big "100" watermark in background
      ctx.font = 'bold 296px "Courier New", monospace';
      ctx.fillStyle = 'rgba(6, 95, 70, 0.22)';
      ctx.fillText('100', 1460, 740);

      // Treasury seal (green circular badge)
      ctx.beginPath();
      ctx.arc(1520, 580, 96, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 150, 105, 0.45)';
      ctx.fill();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Federal Reserve crest (left badge)
      ctx.beginPath();
      ctx.arc(520, 600, 104, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 78, 59, 0.38)';
      ctx.fill();

      // Bottom banner
      ctx.font = 'bold 64px "Courier New", monospace';
      ctx.fillStyle = '#047857';
      ctx.fillText('ONE HUNDRED DOLLARS', 1024, 1140);

      // --- WHITE CURRENCY STRAP (wrapped vertically across the center) ---
      const strapWidth = 336;
      const strapX = (2048 - strapWidth) / 2;

      // Strap shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(strapX - 20, 0, 20, 1280);
      ctx.fillRect(strapX + strapWidth, 0, 20, 1280);

      // Strap paper (clean white/cream)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(strapX, 0, strapWidth, 1280);

      // Strap outer borders
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(strapX, 0, strapWidth, 1280);

      // Strap green center stripe
      ctx.fillStyle = '#10b981';
      ctx.fillRect(strapX + 40, 0, strapWidth - 80, 1280);

      // White inner label on strap
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(strapX + 64, 380, strapWidth - 128, 520);
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 8;
      ctx.strokeRect(strapX + 64, 380, strapWidth - 128, 520);

      // Strap text: $10,000 in crisp typography
      ctx.save();
      ctx.translate(1024, 640);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 88px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('$10,000', 0, 28);
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      return texture;
    };

    // B. Bottom face ($100 bill reverse side with strap)
    const createBottomBillTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = '#dcfce7';
      ctx.fillRect(0, 0, 2048, 1280);

      // Border
      ctx.strokeStyle = '#047857';
      ctx.lineWidth = 32;
      ctx.strokeRect(40, 40, 1968, 1200);

      // Independence Hall style vignette
      ctx.fillStyle = '#065f46';
      ctx.fillRect(640, 480, 768, 280);
      ctx.fillRect(944, 300, 160, 200);

      ctx.font = 'bold 128px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('IN GOD WE TRUST', 1024, 240);
      ctx.fillText('100', 320, 320);
      ctx.fillText('100', 1728, 320);

      // Strap on bottom
      const strapWidth = 336;
      const strapX = (2048 - strapWidth) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(strapX, 0, strapWidth, 1280);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(strapX + 40, 0, strapWidth - 80, 1280);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      return texture;
    };

    // C. Long side face (stacked paper sheets + white strap)
    const createLongEdgeTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 640;
      const ctx = canvas.getContext('2d')!;

      // Paper stack background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 2048, 640);

      // Fine banknote sheets layering
      for (let y = 0; y < 640; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#d1fae5' : y % 12 === 0 ? '#cbd5e1' : '#f1f5f9';
        ctx.fillRect(0, y, 2048, 3);
      }

      // Subtle green currency ink edge lines
      for (let y = 16; y < 624; y += 24) {
        ctx.fillStyle = 'rgba(5, 150, 105, 0.45)';
        ctx.fillRect(0, y, 2048, 2.5);
      }

      // Top and bottom edge green lines
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 2048, 16);
      ctx.fillRect(0, 624, 2048, 16);

      // Strap wrapping around long edge
      const strapWidth = 336;
      const strapX = (2048 - strapWidth) / 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(strapX - 16, 0, 16, 640);
      ctx.fillRect(strapX + strapWidth, 0, 16, 640);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(strapX, 0, strapWidth, 640);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(strapX + 40, 0, strapWidth - 80, 640);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      return texture;
    };

    // D. Short side face (short edge of bill stack)
    const createShortEdgeTexture = (): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 640;
      const ctx = canvas.getContext('2d')!;

      // Stacked paper lines
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 1280, 640);

      for (let y = 0; y < 640; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#d1fae5' : y % 12 === 0 ? '#cbd5e1' : '#f1f5f9';
        ctx.fillRect(0, y, 1280, 3);
      }

      for (let y = 16; y < 624; y += 24) {
        ctx.fillStyle = 'rgba(5, 150, 105, 0.45)';
        ctx.fillRect(0, y, 1280, 2.5);
      }

      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 1280, 16);
      ctx.fillRect(0, 624, 1280, 16);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = maxAnisotropy;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      return texture;
    };

    // -------------------------------------------------------------
    // 3. Build the 3D Money Bundle
    // -------------------------------------------------------------
    // Dimensions: Width: 2.8, Height: 0.95, Depth: 1.7
    const bundleGeometry = new THREE.BoxGeometry(2.8, 0.95, 1.7);

    const topTexture = createTopBillTexture();
    const bottomTexture = createBottomBillTexture();
    const longEdgeTexture = createLongEdgeTexture();
    const shortEdgeTexture = createShortEdgeTexture();

    // Box materials order: [+X, -X, +Y, -Y, +Z, -Z]
    // [+X, -X] = Short edges (Right, Left)
    // [+Y, -Y] = Top, Bottom (Front bill face, Reverse bill face)
    // [+Z, -Z] = Long edges (Front, Back)
    const materials = [
      new THREE.MeshStandardMaterial({ map: shortEdgeTexture, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ map: shortEdgeTexture, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ map: topTexture, roughness: 0.45, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: bottomTexture, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: longEdgeTexture, roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ map: longEdgeTexture, roughness: 0.85 }),
    ];

    const moneyBundleMesh = new THREE.Mesh(bundleGeometry, materials);
    moneyBundleMesh.castShadow = true;
    moneyBundleMesh.receiveShadow = true;

    // Group for the floating & rotating money bundle
    const moneyGroup = new THREE.Group();
    // Default base floating height: 1.2 units above ground (platform top is ~0.4)
    moneyGroup.position.set(0, 1.2, 0);
    moneyGroup.add(moneyBundleMesh);
    scene.add(moneyGroup);

    // -------------------------------------------------------------
    // 4. Build the Stationary Hexagonal Neon Pedestal
    // -------------------------------------------------------------
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -0.15, 0);

    // Hexagonal beveled cylinder base: radiusTop: 2.1, radiusBottom: 2.45, height: 0.5, radialSegments: 6
    const baseGeo = new THREE.CylinderGeometry(2.1, 2.45, 0.5, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // dark sleek obsidian slate
      roughness: 0.35,
      metalness: 0.7,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    // Pedestal top rim / chamfer layer
    const rimGeo = new THREE.CylinderGeometry(1.95, 2.1, 0.16, 6);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.8,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0.3;
    rimMesh.receiveShadow = true;
    pedestalGroup.add(rimMesh);

    // Glowing Neon Green Edge Lines on the hexagonal rim (high contrast & crispness)
    const edgeGeo = new THREE.EdgesGeometry(rimGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x4ade80,
      linewidth: 3,
    });
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLines.position.y = 0.3;
    pedestalGroup.add(edgeLines);

    // Glowing Neon Green Ring/Hexagon on top of the pedestal
    const topHexGeo = new THREE.RingGeometry(0.7, 1.45, 6);
    const topHexMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const topHexMesh = new THREE.Mesh(topHexGeo, topHexMat);
    topHexMesh.rotation.x = -Math.PI / 2;
    topHexMesh.position.y = 0.39;
    pedestalGroup.add(topHexMesh);

    // Soft glowing center ring
    const centerGlowGeo = new THREE.CircleGeometry(0.85, 32);
    const centerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.38,
    });
    const centerGlowMesh = new THREE.Mesh(centerGlowGeo, centerGlowMat);
    centerGlowMesh.rotation.x = -Math.PI / 2;
    centerGlowMesh.position.y = 0.395;
    pedestalGroup.add(centerGlowMesh);

    scene.add(pedestalGroup);

    // -------------------------------------------------------------
    // 5. Animation Loop
    // -------------------------------------------------------------
    let animationFrameId: number;
    let startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = (performance.now() - startTime) / 1000;

      if (!prefersReducedMotion) {
        // Continuous smooth 360-degree rotation around Y axis (~2.8s per cycle)
        moneyGroup.rotation.y = elapsed * 2.25;

        // Gentle floating bob (up and down 3-5px equivalent in 3D units)
        const floatOffset = Math.sin(elapsed * 2.5) * 0.12;
        moneyGroup.position.y = 1.18 + floatOffset;

        // Subtle 3D tilt wobble to showcase top face and depth matching video
        moneyGroup.rotation.x = 0.08 + Math.sin(elapsed * 1.5) * 0.03;
        moneyGroup.rotation.z = Math.cos(elapsed * 1.8) * 0.03;

        // Subtle neon light pulsation
        neonPointLight.intensity = 4.5 + Math.sin(elapsed * 4.0) * 0.8;
        topHexMat.opacity = 0.5 + Math.sin(elapsed * 3.0) * 0.15;
      } else {
        // Stationary aesthetic position for reduced-motion users
        moneyGroup.rotation.y = 0.75;
        moneyGroup.position.y = 1.18;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      bundleGeometry.dispose();
      baseGeo.dispose();
      rimGeo.dispose();
      edgeGeo.dispose();
      topHexGeo.dispose();
      centerGlowGeo.dispose();
      topTexture.dispose();
      bottomTexture.dispose();
      longEdgeTexture.dispose();
      shortEdgeTexture.dispose();
      materials.forEach((m) => m.dispose());
      baseMat.dispose();
      rimMat.dispose();
      edgeMat.dispose();
      topHexMat.dispose();
      centerGlowMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none flex items-center justify-center shrink-0 ${
        isMobile ? 'w-[48px] h-[32px]' : 'w-[80px] h-[54px]'
      }`}
      style={{
        filter: isMobile
          ? 'drop-shadow(0 2px 5px rgba(16, 185, 129, 0.25))'
          : 'drop-shadow(0 3px 8px rgba(16, 185, 129, 0.25))',
      }}
      title="3D Floating Money Bundle"
      aria-hidden="true"
    />
  );
};
