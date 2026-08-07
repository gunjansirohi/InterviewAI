const templates = {
  classic: { accent: '#1e293b', heading: 13, body: 10, name: 24 },
  modern: { accent: '#4f46e5', heading: 13, body: 10, name: 25 },
  minimal: { accent: '#111827', heading: 11, body: 9.5, name: 22 },
};

export function renderResume(doc, resume) {
  const style = templates[resume.template] || templates.classic;
  const info = resume.personalInfo;
  doc.fillColor(style.accent).font('Helvetica-Bold').fontSize(style.name).text(info.name || 'Untitled Resume');
  doc.fillColor('#475569').font('Helvetica').fontSize(9).text([info.email, info.phone, info.location, info.linkedIn, info.website].filter(Boolean).join('  |  '));
  doc.moveDown(1);

  if (resume.summary) section(doc, 'Professional Summary', style, () => doc.font('Helvetica').fontSize(style.body).fillColor('#1f2937').text(resume.summary));
  if (resume.skills.length) section(doc, 'Skills', style, () => doc.font('Helvetica').fontSize(style.body).fillColor('#1f2937').text(resume.skills.join('  •  ')));
  if (resume.experience.length) section(doc, 'Experience', style, () => resume.experience.forEach((item) => {
    doc.font('Helvetica-Bold').fontSize(style.body + 1).fillColor('#111827').text(`${item.role || ''}${item.company ? ` — ${item.company}` : ''}`);
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b').text([item.startDate, item.endDate].filter(Boolean).join(' – '));
    item.descriptions.forEach((description) => doc.font('Helvetica').fontSize(style.body).fillColor('#334155').text(`• ${description}`, { indent: 10 }));
    doc.moveDown(0.5);
  }));
  if (resume.projects.length) section(doc, 'Projects', style, () => resume.projects.forEach((item) => {
    doc.font('Helvetica-Bold').fontSize(style.body + 1).fillColor('#111827').text(item.name || 'Project');
    if (item.description) doc.font('Helvetica').fontSize(style.body).fillColor('#334155').text(item.description);
    if (item.technologies.length) doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b').text(item.technologies.join(', '));
    doc.moveDown(0.5);
  }));
  if (resume.education.length) section(doc, 'Education', style, () => resume.education.forEach((item) => {
    doc.font('Helvetica-Bold').fontSize(style.body + 1).fillColor('#111827').text([item.degree, item.field].filter(Boolean).join(' in '));
    doc.font('Helvetica').fontSize(style.body).fillColor('#334155').text([item.institution, item.startDate, item.endDate].filter(Boolean).join('  |  '));
    doc.moveDown(0.4);
  }));
  if (resume.certifications.length) section(doc, 'Certifications', style, () => doc.font('Helvetica').fontSize(style.body).fillColor('#334155').text(resume.certifications.join('  •  ')));
  if (resume.languages.length) section(doc, 'Languages', style, () => doc.font('Helvetica').fontSize(style.body).fillColor('#334155').text(resume.languages.join('  •  ')));
}

function section(doc, title, style, render) {
  doc.moveDown(0.7).fillColor(style.accent).font('Helvetica-Bold').fontSize(style.heading).text(title.toUpperCase());
  doc.moveTo(doc.x, doc.y + 2).lineTo(555, doc.y + 2).strokeColor(style.accent).lineWidth(0.7).stroke();
  doc.moveDown(0.5);
  render();
}
