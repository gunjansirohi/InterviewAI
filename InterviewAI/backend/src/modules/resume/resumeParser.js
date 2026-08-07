import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export function normalizeExtractedText(text) {
  const normalized = text
    .normalize('NFKC')
    .replace(/\u0000/g, '')
    .replace(/\u00a0/g, ' ')
    // PDF font encodings commonly map bullets to private-use glyphs such as U+E12C.
    // Treat a symbol at the beginning of a line as a bullet, but leave symbols in text intact.
    .replace(/^[\uE000-\uF8FF\u2022\u25CF\u25AA\u25E6\u25B8\u25BA\u25C6\u2219\u00B7\-*]\s*/gm, '\u2022 ')
    .replace(/^(?:[^\p{L}\p{N}\s]\s+)(?=\S)/gmu, '\u2022 ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const output = [];
  for (const line of normalized.split('\n')) {
    const duplicateNearby = line && output.slice(-3).some((previous) => previous === line);
    if (!duplicateNearby) output.push(line);
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function extractResumeText(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const buffer = await readFile(file.path);
  let text = '';
  let pages = null;

  if (extension === '.pdf') {
    if (buffer.subarray(0, 5).toString() !== '%PDF-') throwInvalidFile();
    const result = await pdfParse(buffer);
    text = result.text;
    pages = result.numpages;
  } else if (extension === '.docx') {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throwInvalidFile();
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else {
    const error = new Error('Unsupported resume file type');
    error.status = 400;
    throw error;
  }

  const normalizedText = normalizeExtractedText(text);
  if (!normalizedText) {
    const error = new Error('No readable text was found in the resume');
    error.status = 422;
    throw error;
  }

  console.info('[resume-text-extracted]', {
    fileType: extension.slice(1),
    characters: normalizedText.length,
    pages,
    // This is intentionally a bounded preview: resume text can contain sensitive data.
    preview: normalizedText.slice(0, 1000),
  });
  return normalizedText;
}

function throwInvalidFile() {
  const error = new Error('The uploaded file content does not match its file type');
  error.status = 400;
  throw error;
}

