import fs from 'fs';
import path from 'path';

export type LegalDocSlug = 'mentions-legales' | 'politique-confidentialite' | 'conditions-utilisation';

export function getLegalContent(slug: LegalDocSlug): string {
  const filePath = path.join(process.cwd(), 'content', 'legal', `${slug}.md`);
  return fs.readFileSync(filePath, 'utf-8');
}
