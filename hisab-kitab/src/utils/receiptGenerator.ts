import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Transaction } from '../types/finance';

export interface ReceiptOptions {
  modeName?: string;
  name?: string;
  category?: string;
  transactionId?: string;
  isDark?: boolean;
  theme?: 'light' | 'dark';
}

export function isReceiptDarkMode(options?: ReceiptOptions): boolean {
  if (options?.isDark !== undefined) {
    return options.isDark;
  }
  if (options?.theme) {
    return options.theme === 'dark';
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return true;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('ledgerly_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      // ignore
    }
  }
  return false;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function formatCurrencyAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

// Rounded rectangle helper supporting cross-browser canvas
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | { tl?: number; tr?: number; br?: number; bl?: number }
) {
  const r = typeof radius === 'number'
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : { tl: radius.tl || 0, tr: radius.tr || 0, br: radius.br || 0, bl: radius.bl || 0 };

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

// Shield logo with keyhole and chart bars
function drawShieldLogo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  color: string = '#FFFFFF'
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const scale = size / 60;
  ctx.scale(scale, scale);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shield Path
  ctx.beginPath();
  ctx.moveTo(-22, -26);
  ctx.lineTo(22, -26);
  ctx.quadraticCurveTo(24, 6, 0, 28);
  ctx.quadraticCurveTo(-24, 6, -22, -26);
  ctx.closePath();
  ctx.stroke();

  // Keyhole circle
  ctx.beginPath();
  ctx.arc(0, -9, 6.5, 0, Math.PI * 2);
  ctx.stroke();

  // Keyhole bottom slot
  ctx.beginPath();
  ctx.moveTo(-2.5, -3);
  ctx.lineTo(-4, 7);
  ctx.lineTo(4, 7);
  ctx.lineTo(2.5, -3);
  ctx.closePath();
  ctx.stroke();

  // Chart bars on right
  ctx.lineWidth = 3;
  // Bar 1
  ctx.beginPath();
  ctx.moveTo(9, 6);
  ctx.lineTo(9, 2);
  ctx.stroke();

  // Bar 2
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(14, -4);
  ctx.stroke();

  // Bar 3
  ctx.beginPath();
  ctx.moveTo(19, 6);
  ctx.lineTo(19, -10);
  ctx.stroke();

  ctx.restore();
}

// Outline icons for table rows
function drawRowIcon(
  ctx: CanvasRenderingContext2D,
  type: 'user' | 'calendar' | 'rupee' | 'card' | 'status',
  x: number,
  y: number,
  color: string = '#64748B'
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'user') {
    // User outline
    ctx.beginPath();
    ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y + 10, 9, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (type === 'calendar') {
    // Calendar outline
    const w = 18;
    const h = 18;
    const ox = x - 9;
    const oy = y - 9;
    drawRoundedRect(ctx, ox, oy, w, h, 3.5);
    ctx.stroke();

    // Top hanger pegs
    ctx.beginPath();
    ctx.moveTo(ox + 4, oy - 2);
    ctx.lineTo(ox + 4, oy + 2);
    ctx.moveTo(ox + w - 4, oy - 2);
    ctx.lineTo(ox + w - 4, oy + 2);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(ox, oy + 6);
    ctx.lineTo(ox + w, oy + 6);
    ctx.stroke();
  } else if (type === 'rupee') {
    // Clean Rupee symbol
    ctx.font = '600 20px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('₹', x, y);
  } else if (type === 'card') {
    // Credit card outline
    const w = 20;
    const h = 15;
    const ox = x - 10;
    const oy = y - 7.5;
    drawRoundedRect(ctx, ox, oy, w, h, 3);
    ctx.stroke();

    // Card magnetic stripe
    ctx.beginPath();
    ctx.moveTo(ox, oy + 4);
    ctx.lineTo(ox + w, oy + 4);
    ctx.stroke();
  } else if (type === 'status') {
    // Check circle
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.stroke();

    // Checkmark inside
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x - 1, y + 3.5);
    ctx.lineTo(x + 4.5, y - 3);
    ctx.stroke();
  }

  ctx.restore();
}

// Receipt document icon next to "Payment Receipt"
function drawDocumentIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string = '#3730A3') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = 24;
  const h = 30;
  const ox = x - 12;
  const oy = y - 15;

  // Document body with folded corner at top-right
  ctx.beginPath();
  ctx.moveTo(ox, oy + 4);
  ctx.lineTo(ox, oy + h - 4);
  ctx.quadraticCurveTo(ox, oy + h, ox + 4, oy + h);
  ctx.lineTo(ox + w - 4, oy + h);
  ctx.quadraticCurveTo(ox + w, oy + h, ox + w, oy + h - 4);
  ctx.lineTo(ox + w, oy + 8);
  ctx.lineTo(ox + w - 8, oy);
  ctx.lineTo(ox + 4, oy);
  ctx.quadraticCurveTo(ox, oy, ox, oy + 4);
  ctx.closePath();
  ctx.stroke();

  // Folded triangle corner
  ctx.beginPath();
  ctx.moveTo(ox + w - 8, oy);
  ctx.lineTo(ox + w - 8, oy + 8);
  ctx.lineTo(ox + w, oy + 8);
  ctx.stroke();

  // 3 content lines
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox + 5, oy + 12);
  ctx.lineTo(ox + w - 6, oy + 12);
  ctx.moveTo(ox + 5, oy + 17);
  ctx.lineTo(ox + w - 6, oy + 17);
  ctx.moveTo(ox + 5, oy + 22);
  ctx.lineTo(ox + w - 10, oy + 22);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders the pixel-perfect Receipt image on an HTML5 canvas matching the user's reference design
 */
export function renderReceiptToCanvas(
  tx: Transaction,
  modeName: string = 'General',
  options?: ReceiptOptions
): HTMLCanvasElement {
  const isDark = isReceiptDarkMode(options);

  const canvas = document.createElement('canvas');
  // High-res retina canvas dimensions (ratio 1 : 1.5)
  const W = 900;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Theme-specific color palette matching Ledgerly App
  const themeColors = isDark
    ? {
        pageBg: '#090D16',
        cardBg: '#0F172A',
        cardBorder: '#1E293B',
        bannerGradStart: '#261B72',
        bannerGradMid: '#2E2088',
        bannerGradEnd: '#18104E',
        bannerGlow1: 'rgba(12, 8, 38, 0.65)',
        bannerGlow2: 'rgba(28, 18, 80, 0.45)',
        bannerTagline: '#C7D2FE',
        docIcon: '#8174F7',
        titleText: '#F8FAFC',
        subtitleText: '#94A3B8',
        pillBg: '#064E3B',
        pillBorder: '#059669',
        pillCircle: '#10B981',
        pillText: '#34D399',
        tableBg: '#1E293B',
        tableBorder: '#334155',
        tableDivider: '#334155',
        rowIcon: '#94A3B8',
        rowLabel: '#94A3B8',
        rowValue: '#F8FAFC',
        rowStatus: '#34D399',
        footerDivider: '#334155',
        footerText: '#94A3B8',
        brandDivider: '#334155',
        brandLogo: '#8174F7',
        brandText: '#A5B4FC',
      }
    : {
        pageBg: '#FFFFFF',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        bannerGradStart: '#3F32A3',
        bannerGradMid: '#4135B2',
        bannerGradEnd: '#2E2282',
        bannerGlow1: 'rgba(28, 18, 90, 0.45)',
        bannerGlow2: 'rgba(56, 40, 145, 0.35)',
        bannerTagline: '#C7D2FE',
        docIcon: '#3730A3',
        titleText: '#1E1B4B',
        subtitleText: '#64748B',
        pillBg: '#E6FBF2',
        pillBorder: '#A7F3D0',
        pillCircle: '#10B981',
        pillText: '#059669',
        tableBg: '#FFFFFF',
        tableBorder: '#E2E8F0',
        tableDivider: '#F1F5F9',
        rowIcon: '#64748B',
        rowLabel: '#64748B',
        rowValue: '#0F172A',
        rowStatus: '#059669',
        footerDivider: '#E2E8F0',
        footerText: '#64748B',
        brandDivider: '#E2E8F0',
        brandLogo: '#3730A3',
        brandText: '#3730A3',
      };

  // Outer Page Tint / Background
  ctx.fillStyle = themeColors.pageBg;
  ctx.fillRect(0, 0, W, H);

  // Outer Card Frame
  const cardX = 24;
  const cardY = 24;
  const cardW = W - 48; // 852
  const cardH = H - 48; // 1302
  const cardRadius = 26;

  // Card shadow / border
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = themeColors.cardBg;
  ctx.fill();
  ctx.strokeStyle = themeColors.cardBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 1. TOP HEADER BANNER
  const bannerH = 190;
  ctx.save();
  // Clip banner to top rounded corners of the card
  drawRoundedRect(ctx, cardX, cardY, cardW, bannerH, { tl: cardRadius, tr: cardRadius, br: 0, bl: 0 });
  ctx.clip();

  // Rich indigo/violet gradient
  const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + bannerH);
  grad.addColorStop(0, themeColors.bannerGradStart);
  grad.addColorStop(0.5, themeColors.bannerGradMid);
  grad.addColorStop(1, themeColors.bannerGradEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(cardX, cardY, cardW, bannerH);

  // Decorative organic glow / wave overlay on bottom-right of banner
  ctx.fillStyle = themeColors.bannerGlow1;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.55, cardY + bannerH);
  ctx.quadraticCurveTo(cardX + cardW * 0.72, cardY + bannerH * 0.55, cardX + cardW, cardY + bannerH * 0.2);
  ctx.lineTo(cardX + cardW, cardY + bannerH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = themeColors.bannerGlow2;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.42, cardY + bannerH);
  ctx.quadraticCurveTo(cardX + cardW * 0.65, cardY + bannerH * 0.4, cardX + cardW, cardY + bannerH * 0.5);
  ctx.lineTo(cardX + cardW, cardY + bannerH);
  ctx.closePath();
  ctx.fill();

  // Header Shield Logo
  const logoX = cardX + 90;
  const logoY = cardY + bannerH * 0.5;
  drawShieldLogo(ctx, logoX, logoY, 68, '#FFFFFF');

  // Header Title & Tagline
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 42px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('LEDGERLY', cardX + 145, cardY + bannerH * 0.48);

  ctx.fillStyle = themeColors.bannerTagline;
  ctx.font = '500 18px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Your Personal Finance Companion', cardX + 147, cardY + bannerH * 0.69);

  ctx.restore();

  // 2. TITLE SECTION (Payment Receipt)
  const titleY = cardY + bannerH + 85;

  // Document Icon + Text centered
  const receiptTitle = 'Payment Receipt';
  ctx.font = '700 38px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const textWidth = ctx.measureText(receiptTitle).width;
  const iconSpacing = 42;
  const startTotalX = (W - (textWidth + iconSpacing)) / 2;

  drawDocumentIcon(ctx, startTotalX + 14, titleY - 12, themeColors.docIcon);

  ctx.textAlign = 'left';
  ctx.fillStyle = themeColors.titleText;
  ctx.fillText(receiptTitle, startTotalX + iconSpacing, titleY);

  // Subtitle
  ctx.textAlign = 'center';
  ctx.fillStyle = themeColors.subtitleText;
  ctx.font = '500 19px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Thank you for using Ledgerly', W / 2, titleY + 44);

  // 3. STATUS PILL BADGE
  const pillW = 240;
  const pillH = 58;
  const pillX = (W - pillW) / 2;
  const pillY = titleY + 76;
  const pillRadius = pillH / 2;

  // Pill background
  drawRoundedRect(ctx, pillW ? pillX : 0, pillY, pillW, pillH, pillRadius);
  ctx.fillStyle = themeColors.pillBg;
  ctx.fill();
  ctx.strokeStyle = themeColors.pillBorder;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Emerald checkmark circle icon
  const checkCircleX = pillX + 38;
  const checkCircleY = pillY + pillH / 2;
  const checkRadius = 17;

  ctx.beginPath();
  ctx.arc(checkCircleX, checkCircleY, checkRadius, 0, Math.PI * 2);
  ctx.fillStyle = themeColors.pillCircle;
  ctx.fill();

  // White checkmark
  ctx.beginPath();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(checkCircleX - 6, checkCircleY);
  ctx.lineTo(checkCircleX - 1.5, checkCircleY + 4.5);
  ctx.lineTo(checkCircleX + 6.5, checkCircleY - 4);
  ctx.stroke();

  // Pill label
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = themeColors.pillText;
  ctx.font = '700 21px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Successful', pillX + 68, checkCircleY);

  // 4. TRANSACTION DETAILS TABLE CARD
  const tableX = cardX + 44;
  const tableY = pillY + pillH + 42;
  const tableW = cardW - 88; // 764
  const tableH = 430;
  const tableRadius = 18;

  // Details container card
  drawRoundedRect(ctx, tableX, tableY, tableW, tableH, tableRadius);
  ctx.fillStyle = themeColors.tableBg;
  ctx.fill();
  ctx.strokeStyle = themeColors.tableBorder;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Resolve values
  const displayName = options?.name || tx.merchant || 'Recipient';
  const displayDate = formatDisplayDate(tx.date);
  const displayAmount = `₹ ${formatCurrencyAmount(tx.amount)}`;
  const displayPaymentMethod = (tx.paymentMode || tx.account || 'UPI').trim();
  const displayStatus = 'Successful';

  const rows = [
    { type: 'user' as const, label: 'Name', value: displayName, isStatus: false },
    { type: 'calendar' as const, label: 'Date', value: displayDate, isStatus: false },
    { type: 'rupee' as const, label: 'Amount', value: displayAmount, isStatus: false },
    { type: 'card' as const, label: 'Payment Method', value: displayPaymentMethod, isStatus: false },
    { type: 'status' as const, label: 'Status', value: displayStatus, isStatus: true },
  ];

  const rowCount = rows.length;
  const rowH = tableH / rowCount; // 86px

  rows.forEach((row, idx) => {
    const currentY = tableY + idx * rowH;
    const centerY = currentY + rowH / 2;

    // Divider line between rows (except last)
    if (idx < rowCount - 1) {
      ctx.beginPath();
      ctx.strokeStyle = themeColors.tableDivider;
      ctx.lineWidth = 1.5;
      ctx.moveTo(tableX + 24, currentY + rowH);
      ctx.lineTo(tableX + tableW - 24, currentY + rowH);
      ctx.stroke();
    }

    // Left Column: Icon + Label
    const iconX = tableX + 42;
    drawRowIcon(ctx, row.type, iconX, centerY, themeColors.rowIcon);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = themeColors.rowLabel;
    ctx.font = '500 20px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(row.label, tableX + 74, centerY);

    // Right Column: Value
    ctx.textAlign = 'right';
    if (row.isStatus) {
      ctx.fillStyle = themeColors.rowStatus;
      ctx.font = '700 21px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    } else {
      ctx.fillStyle = themeColors.rowValue;
      ctx.font = '700 21px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }
    ctx.fillText(row.value, tableX + tableW - 40, centerY);
  });

  // 5. FOOTER SECTION
  const footerDividerY = tableY + tableH + 46;

  // Thin separator line
  ctx.beginPath();
  ctx.strokeStyle = themeColors.footerDivider;
  ctx.lineWidth = 1.5;
  ctx.moveTo(tableX, footerDividerY);
  ctx.lineTo(tableX + tableW, footerDividerY);
  ctx.stroke();

  // Disclaimer text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = themeColors.footerText;
  ctx.font = '400 16px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('This is a system generated receipt from Ledgerly', W / 2, footerDividerY + 44);
  ctx.fillText('and does not require a signature.', W / 2, footerDividerY + 70);

  // Bottom Branding with Shield + LEDGERLY between divider bars
  const brandY = footerDividerY + 128;
  const brandLineWidth = 90;
  const brandGap = 80;

  // Left Line
  ctx.beginPath();
  ctx.strokeStyle = themeColors.brandDivider;
  ctx.lineWidth = 1.6;
  ctx.moveTo(W / 2 - brandGap - brandLineWidth, brandY);
  ctx.lineTo(W / 2 - brandGap, brandY);
  ctx.stroke();

  // Right Line
  ctx.beginPath();
  ctx.moveTo(W / 2 + brandGap, brandY);
  ctx.lineTo(W / 2 + brandGap + brandLineWidth, brandY);
  ctx.stroke();

  // Center Shield Logo + LEDGERLY
  drawShieldLogo(ctx, W / 2 - 46, brandY, 32, themeColors.brandLogo);

  ctx.textAlign = 'left';
  ctx.fillStyle = themeColors.brandText;
  ctx.font = '800 17px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('LEDGERLY', W / 2 - 20, brandY + 1);

  return canvas;
}

/**
 * Downloads single receipt as a high-fidelity PDF adhering to the reference card design
 */
export async function generateSingleReceiptPdf(
  tx: Transaction,
  modeName: string = 'General',
  options?: ReceiptOptions
): Promise<void> {
  // Wait for Google fonts to be ready if in browser
  if (typeof document !== 'undefined' && (document as any).fonts) {
    try {
      await (document as any).fonts.ready;
    } catch {
      // ignore
    }
  }

  const isDark = isReceiptDarkMode(options);
  const canvas = renderReceiptToCanvas(tx, modeName, { ...options, isDark });
  const imgData = canvas.toDataURL('image/png', 1.0);

  // Standard A5 format (148 x 210 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 148
  const pageHeight = doc.internal.pageSize.getHeight(); // 210

  // Fill outer page background matching theme so margins seamlessly blend
  if (isDark) {
    doc.setFillColor(9, 13, 22); // #090D16 matching dark canvas background
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  } else {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  }

  // 4mm margin on A5
  const marginX = 4;
  const marginY = 4;
  const printWidth = pageWidth - marginX * 2; // 140 mm
  const printHeight = pageHeight - marginY * 2; // 202 mm

  doc.addImage(imgData, 'PNG', marginX, marginY, printWidth, printHeight, undefined, 'FAST');

  const safeMerchant = (tx.merchant || 'Transaction').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15);
  const cleanTxId = (tx.id || '').replace(/^tx_/, '').slice(0, 8).toUpperCase();
  const themeTag = isDark ? '_Dark' : '_Light';
  doc.save(`Receipt_${safeMerchant}_${cleanTxId || 'TXN'}${themeTag}.pdf`);
}

/**
 * Bulk transactions PDF report
 */
export function generateBulkTransactionsPdf(
  transactions: Transaction[],
  title: string = 'Transactions Report',
  options?: { isDark?: boolean; theme?: 'light' | 'dark' }
): void {
  const isDark = isReceiptDarkMode(options);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Calculate stats
  const totalCount = transactions.length;
  let totalExpenses = 0;
  let totalIncome = 0;

  for (const t of transactions) {
    if (t.type === 'expense') totalExpenses += t.amount;
    else totalIncome += t.amount;
  }

  const tableData = transactions.map((t) => [
    t.date,
    t.merchant,
    t.category,
    t.paymentMode || t.account || 'UPI',
    t.type === 'income' ? 'Income' : 'Expense',
    `${t.type === 'income' ? '+' : '-'} ₹ ${t.amount.toLocaleString('en-IN')}`,
  ]);

  if (isDark) {
    // Fill full A4 with dark slate
    doc.setFillColor(15, 23, 42); // #0F172A
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header Banner
    doc.setFillColor(38, 27, 114); // #261B72
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('LEDGERLY', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(199, 210, 254);
    doc.text(`${title} • Generated on ${new Date().toLocaleDateString('en-GB')}`, 14, 20);

    // Summary box
    doc.setFillColor(30, 41, 59); // #1E293B
    doc.setDrawColor(51, 65, 85); // #334155
    doc.roundedRect(14, 34, pageWidth - 28, 18, 3, 3, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(203, 213, 225);
    doc.text(`SELECTED ENTRIES: ${totalCount}`, 20, 44);

    doc.setTextColor(248, 113, 113); // red-400
    doc.text(`EXPENSES: ₹ ${totalExpenses.toLocaleString('en-IN')}`, 75, 44);

    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(`INCOME: ₹ ${totalIncome.toLocaleString('en-IN')}`, 135, 44);

    autoTable(doc, {
      startY: 56,
      margin: { left: 14, right: 14 },
      head: [['Date', 'Recipient / Merchant', 'Category', 'Payment Mode', 'Type', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [38, 27, 114],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [241, 245, 249],
        fillColor: [15, 23, 42],
        lineColor: [51, 65, 85],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 46, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [30, 41, 59],
      },
    });

    const nowStr = new Date().toISOString().split('T')[0];
    doc.save(`Ledgerly_Report_${nowStr}_${totalCount}_items_Dark.pdf`);
    return;
  }

  // Header Banner
  doc.setFillColor(63, 50, 163); // #3F32A3
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('LEDGERLY', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 231, 255);
  doc.text(`${title} • Generated on ${new Date().toLocaleDateString('en-GB')}`, 14, 20);

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 34, pageWidth - 28, 18, 3, 3, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(`SELECTED ENTRIES: ${totalCount}`, 20, 44);

  doc.setTextColor(220, 38, 38);
  doc.text(`EXPENSES: ₹ ${totalExpenses.toLocaleString('en-IN')}`, 75, 44);

  doc.setTextColor(16, 185, 129);
  doc.text(`INCOME: ₹ ${totalIncome.toLocaleString('en-IN')}`, 135, 44);

  autoTable(doc, {
    startY: 56,
    margin: { left: 14, right: 14 },
    head: [['Date', 'Recipient / Merchant', 'Category', 'Payment Mode', 'Type', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [63, 50, 163],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 28 },
      4: { cellWidth: 20 },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const nowStr = new Date().toISOString().split('T')[0];
  doc.save(`Ledgerly_Report_${nowStr}_${totalCount}_items.pdf`);
}

/**
 * Formats a transaction date safely and clearly for Excel (e.g. "08-Oct-2026").
 * Directly parses date components to eliminate timezone shifting bugs.
 */
export function formatExcelDate(dateStr?: string | null, createdAtStr?: string | null): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const parseParts = (val?: string | null): { year: number; month: number; day: number } | null => {
    if (!val || typeof val !== 'string') return null;
    const clean = val.trim();
    if (!clean) return null;

    // 1. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (e.g. 2026-10-08)
    const ymd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      const year = parseInt(ymd[1], 10);
      const month = parseInt(ymd[2], 10);
      const day = parseInt(ymd[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    // 2. Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (e.g. 08-10-2026)
    const dmy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      const day = parseInt(dmy[1], 10);
      const month = parseInt(dmy[2], 10);
      const year = parseInt(dmy[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }

    // 3. Match ISO timestamp with time (e.g. 2026-10-08T17:40:52.814Z)
    if (clean.includes('T')) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
        };
      }
    }

    // 4. Generic Date parse fallback
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      };
    }

    return null;
  };

  const parsed = parseParts(dateStr) || parseParts(createdAtStr);
  if (parsed) {
    const dayStr = String(parsed.day).padStart(2, '0');
    const monthStr = MONTHS[parsed.month - 1];
    return `${dayStr}-${monthStr}-${parsed.year}`;
  }

  // Graceful fallback to current date so no date is ever missing
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = MONTHS[now.getMonth()];
  return `${dayStr}-${monthStr}-${now.getFullYear()}`;
}

/**
 * Formats full timestamp clearly for Excel (e.g. "08-Oct-2026 05:40 PM")
 */
export function formatExcelDateTime(createdAtStr?: string | null, fallbackDateStr?: string | null): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (createdAtStr && typeof createdAtStr === 'string' && createdAtStr.trim()) {
    const d = new Date(createdAtStr.trim());
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, '0');
      return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
    }
  }
  return formatExcelDate(fallbackDateStr, createdAtStr);
}

/**
 * Excel export with auto-fitted column widths, row heights, and clean cell alignment
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  filename: string = 'Ledgerly_Transactions'
): void {
  const headers = [
    'Transaction ID',
    'Date',
    'Merchant / Recipient',
    'Category',
    'Payment Method',
    'Type',
    'Amount (INR)',
    'Tags',
    'Receipt Attached',
    'Record Created At',
  ];

  const rows = transactions.map((t) => [
    t.id ? t.id.replace(/^tx_/, 'TXN-').toUpperCase() : 'TXN',
    formatExcelDate(t.date, t.createdAt),
    t.merchant || 'Unknown',
    t.category || 'General',
    t.paymentMode || t.account || 'UPI',
    t.type === 'income' ? 'Income' : 'Expense',
    t.amount != null ? Number(t.amount.toFixed(2)) : 0,
    (t.tags || []).join(', '),
    t.receiptAttached ? 'Yes' : 'No',
    formatExcelDateTime(t.createdAt, t.date),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Minimum column widths tailored per column so headers and content are never cramped or cut off
  const columnMinWidths = [24, 16, 24, 18, 18, 12, 16, 20, 18, 24];

  // Auto-fit every column according to its content length + extra breathing room padding
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const row of rows) {
      const rawVal = row[colIdx];
      if (rawVal != null) {
        const lines = String(rawVal).split('\n');
        for (const line of lines) {
          if (line.length > maxLen) {
            maxLen = line.length;
          }
        }
      }
    }
    const minWidth = columnMinWidths[colIdx] || 16;
    return { wch: Math.max(maxLen + 4, minWidth) };
  });
  ws['!cols'] = colWidths;

  // Auto-fit row heights: header row = 28pt, data rows = 22pt (dynamically scaled for multiline content)
  const rowHeights = [
    { hpt: 28 },
    ...rows.map((row) => {
      const lineCount = Math.max(1, ...row.map((val) => String(val || '').split('\n').length));
      return { hpt: Math.max(22, lineCount * 18 + 4) };
    }),
  ];
  ws['!rows'] = rowHeights;

  // Freeze header row so column names stay visible on scroll
  ws['!views'] = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];

  // Auto-filter on all data columns
  if (rows.length > 0) {
    ws['!autofilter'] = { ref: `A1:J${rows.length + 1}` };
  }

  // Format cells: Amount column numeric formatting and alignment hints
  for (let r = 0; r < rows.length; r++) {
    const rowIdx = r + 2; // Row 1 is header, 1-indexed

    // Col A (Transaction ID): left aligned
    const idCell = ws[`A${rowIdx}`];
    if (idCell) {
      idCell.s = { alignment: { horizontal: 'left', vertical: 'center' } };
    }

    // Col B (Date): center aligned
    const dateCell = ws[`B${rowIdx}`];
    if (dateCell) {
      dateCell.s = { alignment: { horizontal: 'center', vertical: 'center' } };
    }

    // Col C (Merchant): left aligned
    const merchCell = ws[`C${rowIdx}`];
    if (merchCell) {
      merchCell.s = { alignment: { horizontal: 'left', vertical: 'center' } };
    }

    // Col D (Category): left aligned
    const catCell = ws[`D${rowIdx}`];
    if (catCell) {
      catCell.s = { alignment: { horizontal: 'left', vertical: 'center' } };
    }

    // Col E (Payment Method): left aligned
    const pmCell = ws[`E${rowIdx}`];
    if (pmCell) {
      pmCell.s = { alignment: { horizontal: 'left', vertical: 'center' } };
    }

    // Col F (Type): center aligned
    const typeCell = ws[`F${rowIdx}`];
    if (typeCell) {
      typeCell.s = { alignment: { horizontal: 'center', vertical: 'center' } };
    }

    // Col G (Amount): numeric with 2 decimals, right aligned
    const amtCell = ws[`G${rowIdx}`];
    if (amtCell) {
      amtCell.z = '#,##0.00';
      amtCell.s = { alignment: { horizontal: 'right', vertical: 'center' } };
    }

    // Col H (Tags): left aligned
    const tagsCell = ws[`H${rowIdx}`];
    if (tagsCell) {
      tagsCell.s = { alignment: { horizontal: 'left', vertical: 'center' } };
    }

    // Col I (Receipt Attached): center aligned
    const recCell = ws[`I${rowIdx}`];
    if (recCell) {
      recCell.s = { alignment: { horizontal: 'center', vertical: 'center' } };
    }

    // Col J (Record Created At): center aligned
    const createdCell = ws[`J${rowIdx}`];
    if (createdCell) {
      createdCell.s = { alignment: { horizontal: 'center', vertical: 'center' } };
    }
  }

  // Format header row with bold & alignment hints
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  colLetters.forEach((col) => {
    const headerCell = ws[`${col}1`];
    if (headerCell) {
      headerCell.s = {
        font: { bold: true },
        alignment: {
          horizontal: col === 'G' ? 'right' : ['B', 'F', 'I', 'J'].includes(col) ? 'center' : 'left',
          vertical: 'center',
        },
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

  const nowStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${nowStr}.xlsx`, { bookType: 'xlsx', cellStyles: true });
}

// Backwards-compatible export alias
export const exportTransactionsToExcelCsv = exportTransactionsToExcel;
