import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
  StandardFonts,
  type RGB,
} from "pdf-lib";

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const INK = rgb(0.08, 0.12, 0.09);
const MUTED = rgb(0.38, 0.43, 0.4);
const BRAND = rgb(0.113, 0.612, 0.184);
const BRAND_TINT = rgb(0.918, 0.973, 0.925);
const HAIRLINE = rgb(0.86, 0.9, 0.87);

export type Column = {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

export type Cell = string;

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function createLetter() {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  try {
    const bytes = await readFile(
      path.join(process.cwd(), "public", "luindo-logo.png"),
    );
    logo = await pdf.embedPng(bytes);
  } catch {
    logo = null;
  }

  let page: PDFPage;
  let y = 0;
  let pageNo = 0;

  function newPage() {
    page = pdf.addPage([A4.width, A4.height]);
    pageNo += 1;
    y = A4.height - MARGIN;
    return page;
  }

  function text(
    value: string,
    options: {
      x?: number;
      size?: number;
      font?: PDFFont;
      color?: RGB;
      align?: "left" | "right" | "center";
      width?: number;
      lineHeight?: number;
    } = {},
  ) {
    const size = options.size ?? 9;
    const font = options.font ?? regular;
    const color = options.color ?? INK;
    const width = options.width ?? CONTENT_WIDTH;
    const x = options.x ?? MARGIN;
    const lines = wrap(value, font, size, width);
    const lineHeight = options.lineHeight ?? size * 1.35;
    for (const line of lines) {
      const textWidth = font.widthOfTextAtSize(line, size);
      let drawX = x;
      if (options.align === "right") drawX = x + width - textWidth;
      if (options.align === "center") drawX = x + (width - textWidth) / 2;
      page.drawText(line, { x: drawX, y: y - size, size, font, color });
      y -= lineHeight;
    }
    return lines.length * lineHeight;
  }

  function header() {
    const top = y;
    if (logo) {
      page.drawImage(logo, { x: MARGIN, y: top - 52, width: 86, height: 54 });
    }
    const textX = MARGIN + (logo ? 98 : 0);
    const textWidth = CONTENT_WIDTH - (logo ? 98 : 0);
    y = top;
    text("PT LUINDO PRIMA", {
      x: textX,
      width: textWidth,
      size: 13,
      font: bold,
      color: INK,
      lineHeight: 16,
    });
    text("Divisi NDT · Inventory & Inspeksi", {
      x: textX,
      width: textWidth,
      size: 8.5,
      color: MUTED,
      lineHeight: 12,
    });
    text("Dokumen resmi perusahaan", {
      x: textX,
      width: textWidth,
      size: 8,
      color: MUTED,
      lineHeight: 11,
    });
    y = top - 62;
    page.drawRectangle({
      x: MARGIN,
      y,
      width: CONTENT_WIDTH,
      height: 1.6,
      color: BRAND,
    });
    y -= 30;
  }

  function title(title: string, subtitle?: string) {
    y -= 6;
    text(title, {
      size: 15,
      font: bold,
      align: "center",
      lineHeight: 20,
    });
    if (subtitle) {
      text(subtitle, {
        size: 9,
        color: MUTED,
        align: "center",
        lineHeight: 14,
      });
    }
    y -= 8;
  }

  function meta(rows: [string, string][]) {
    const gap = 12;
    const columnWidth = (CONTENT_WIDTH - gap) / 2;
    const pairs: [string, string][][] = [];
    for (let i = 0; i < rows.length; i += 2) pairs.push(rows.slice(i, i + 2));

    for (const pair of pairs) {
      const startY = y;
      let lowest = y;
      pair.forEach(([label, value], index) => {
        const x = MARGIN + index * (columnWidth + gap);
        y = startY;
        text(label.toUpperCase(), {
          x,
          width: columnWidth,
          size: 7,
          color: MUTED,
          lineHeight: 9,
        });
        text(value, {
          x,
          width: columnWidth,
          size: 9.5,
          font: bold,
          lineHeight: 12,
        });
        lowest = Math.min(lowest, y);
      });
      y = lowest - 8;
    }
    y -= 4;
  }

  function sectionLabel(label: string) {
    y -= 2;
    text(label, { size: 8, font: bold, color: MUTED, lineHeight: 12 });
    y -= 2;
  }

  function table(columns: Column[], rows: Cell[][]) {
    const padding = 5;
    const fontSize = 8.2;
    const lineHeight = 10;

    function drawHead() {
      const height = 20;
      page.drawRectangle({
        x: MARGIN,
        y: y - height,
        width: CONTENT_WIDTH,
        height,
        color: BRAND_TINT,
      });
      let x = MARGIN;
      for (const column of columns) {
        const labelWidth = bold.widthOfTextAtSize(column.label, 7.4);
        const offset =
          column.align === "right"
            ? column.width - padding - labelWidth
            : column.align === "center"
              ? (column.width - labelWidth) / 2
              : padding;
        page.drawText(column.label.toUpperCase(), {
          x: x + offset,
          y: y - 13,
          size: 7.4,
          font: bold,
          color: MUTED,
        });
        x += column.width;
      }
      y -= height;
    }

    function ensureSpace(needed: number) {
      if (y - needed < 96) {
        newPage();
        header();
        drawHead();
      }
    }

    drawHead();

    for (const row of rows) {
      const cells = row.map((cell, index) => {
        const column = columns[index];
        return wrap(
          cell,
          regular,
          fontSize,
          column.width - padding * 2,
        );
      });
      const lines = Math.max(1, ...cells.map((cell) => cell.length));
      const height = lines * lineHeight + padding * 2;
      ensureSpace(height);

      let x = MARGIN;
      cells.forEach((cellLines, index) => {
        const column = columns[index];
        cellLines.forEach((line, lineIndex) => {
          const width = regular.widthOfTextAtSize(line, fontSize);
          const offset =
            column.align === "right"
              ? column.width - padding - width
              : column.align === "center"
                ? (column.width - width) / 2
                : padding;
          page.drawText(line, {
            x: x + offset,
            y: y - padding - fontSize - lineIndex * lineHeight,
            size: fontSize,
            font: regular,
            color: INK,
          });
        });
        x += column.width;
      });
      y -= height;
      page.drawRectangle({
        x: MARGIN,
        y,
        width: CONTENT_WIDTH,
        height: 0.5,
        color: HAIRLINE,
      });
    }
    y -= 16;
  }

  function paragraph(value: string) {
    text(value, { size: 8.5, color: MUTED, lineHeight: 12 });
    y -= 6;
  }

  function signatures(entries: { role: string; name: string }[]) {
    const top = Math.min(y - 18, A4.height - 220);
    const columnWidth = CONTENT_WIDTH / entries.length;
    entries.forEach((entry, index) => {
      const x = MARGIN + index * columnWidth;
      page.drawText(entry.role, {
        x: x + 10,
        y: top,
        size: 8,
        font: regular,
        color: MUTED,
      });
      page.drawLine({
        start: { x: x + 10, y: top - 46 },
        end: { x: x + columnWidth - 18, y: top - 46 },
        thickness: 0.7,
        color: HAIRLINE,
      });
      page.drawText(entry.name || "—", {
        x: x + 10,
        y: top - 60,
        size: 9,
        font: bold,
        color: INK,
      });
      page.drawText("Nama & tanda tangan", {
        x: x + 10,
        y: top - 71,
        size: 7,
        color: MUTED,
      });
    });
    y = top - 84;
  }

  function stamp(label: string, detail: string) {
    const width = Math.max(
      bold.widthOfTextAtSize(label.toUpperCase(), 7.4) + 18,
      regular.widthOfTextAtSize(detail, 7.4) + 18,
    );
    const x = A4.width - MARGIN - width;
    page.drawRectangle({
      x,
      y: y - 28,
      width,
      height: 28,
      borderColor: BRAND,
      borderWidth: 0.8,
      color: BRAND_TINT,
    });
    page.drawText(label.toUpperCase(), {
      x: x + 9,
      y: y - 12,
      size: 7.4,
      font: bold,
      color: BRAND,
    });
    page.drawText(detail, {
      x: x + 9,
      y: y - 23,
      size: 7.4,
      font: regular,
      color: INK,
    });
    y -= 40;
  }

  function finish(date: Date) {
    const pageCount = pdf.getPageCount();
    pdf.getPages().forEach((current, index) => {
      current.drawRectangle({
        x: MARGIN,
        y: 48,
        width: CONTENT_WIDTH,
        height: 0.5,
        color: HAIRLINE,
      });
      current.drawText(
        `Dibuat otomatis oleh NDT Inventory · ${new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(date)}`,
        { x: MARGIN, y: 34, size: 7, font: regular, color: MUTED },
      );
      const label = `Halaman ${index + 1} dari ${pageCount}`;
      current.drawText(label, {
        x: A4.width - MARGIN - regular.widthOfTextAtSize(label, 7),
        y: 34,
        size: 7,
        font: regular,
        color: MUTED,
      });
    });
    return pdf.save();
  }

  newPage();
  header();

  return {
    pdf,
    get page() {
      return page;
    },
    get pageNo() {
      return pageNo;
    },
    header,
    title,
    meta,
    sectionLabel,
    table,
    paragraph,
    signatures,
    stamp,
    finish,
    newPage,
  };
}

export const pdfDate = (value: Date | string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(value))
    : "—";
