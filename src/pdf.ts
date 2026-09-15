import type { ResumeProfile } from "./resume-data";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const MARGIN_TOP = 48;
const LINE_HEIGHT = 14;
const MAX_LINES_PER_PAGE = 48;

function normalizePdfText(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function wrapText(value: string, maxCharacters = 88) {
  const words = normalizePdfText(value).split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxCharacters) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function buildResumeLines(resume: ResumeProfile) {
  const lines: string[] = [
    normalizePdfText(resume.name),
    normalizePdfText(resume.title),
    "",
    `Location: ${resume.details.location}`,
    `Email: ${resume.details.email}`,
    `Phone: ${resume.details.phoneLabel}`,
    `Nationality: ${resume.details.nationality}`,
    `Birth date: ${resume.details.birthDate}`,
    "",
    "Links:",
  ];

  for (const link of resume.links) {
    lines.push(`- ${link.label}: ${link.url}`);
  }

  lines.push("", "Summary:");
  for (const paragraph of resume.summary) {
    lines.push(...wrapText(`- ${paragraph}`));
  }

  lines.push("", "Experience:");
  for (const item of resume.experience) {
    lines.push(`${item.role} | ${item.company}`);
    lines.push(
      `${item.period} | ${item.location} | ${item.employmentTypes.join(", ")}`,
    );

    if (item.client) {
      lines.push(`Client: ${item.client.name}`);
    }

    for (const highlight of item.highlights) {
      lines.push(...wrapText(`- ${highlight}`));
    }

    lines.push(...wrapText(`Technologies: ${item.technologies.join(", ")}`));
    lines.push("");
  }

  lines.push("Education:");
  lines.push(resume.education.degree);
  lines.push(
    `${resume.education.institution} | ${resume.education.period} | GPAX ${resume.education.gpax}`,
  );
  lines.push(
    `Senior project: ${resume.education.seniorProject.name} (${resume.education.seniorProject.url})`,
  );
  lines.push("");
  lines.push(`Core skills: ${resume.skills.join(", ")}`);

  return lines;
}

function createContentStream(lines: string[]) {
  const initialY = PAGE_HEIGHT - MARGIN_TOP;
  const commands = [`BT`, `/F1 11 Tf`, `${MARGIN_X} ${initialY} Td`];

  for (const line of lines) {
    commands.push(`(${escapePdfText(normalizePdfText(line) || " ")}) Tj`);
    commands.push(`0 -${LINE_HEIGHT} Td`);
  }

  commands.push("ET");
  return commands.join("\n");
}

function buildPdf(resume: ResumeProfile) {
  const lineGroups: string[][] = [];
  const lines = buildResumeLines(resume);

  for (let index = 0; index < lines.length; index += MAX_LINES_PER_PAGE) {
    lineGroups.push(lines.slice(index, index + MAX_LINES_PER_PAGE));
  }

  if (lineGroups.length === 0) {
    lineGroups.push([" "]);
  }

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];
  const firstDynamicObjectId = 4;

  lineGroups.forEach((_, pageIndex) => {
    pageObjectIds.push(firstDynamicObjectId + pageIndex * 2);
    contentObjectIds.push(firstDynamicObjectId + pageIndex * 2 + 1);
  });

  objects.push(
    `<< /Type /Pages /Count ${lineGroups.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  lineGroups.forEach((group, pageIndex) => {
    const pageObjectId = pageObjectIds[pageIndex];
    const contentObjectId = contentObjectIds[pageIndex];
    const stream = createContentStream(group);

    objects[pageObjectId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId - 1] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function downloadResumePdf(resume: ResumeProfile) {
  const pdf = buildPdf(resume);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${resume.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-resume.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
