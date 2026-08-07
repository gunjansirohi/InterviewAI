import PDFDocument from 'pdfkit';
import { renderResume } from './templateEngine.js';

export function generateResumePdf(resume) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `${resume.personalInfo.name} Resume`, Author: resume.personalInfo.name } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    renderResume(document, resume);
    document.end();
  });
}
