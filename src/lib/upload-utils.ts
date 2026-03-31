import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const ORIGINALS_DIR = path.join(UPLOADS_DIR, 'originals');

/** Delete both display and original files for a /uploads/... URL */
export async function deleteUploadFiles(fileUrl: string) {
  if (!fileUrl.startsWith('/uploads/')) return;
  const fileName = path.basename(fileUrl);
  await Promise.allSettled([
    fs.unlink(path.join(UPLOADS_DIR, fileName)),
    fs.readdir(ORIGINALS_DIR).then(async files => {
      const uuid = fileName.replace(/\.[^.]+$/, '');
      const orig = files.find(f => f.startsWith(uuid));
      if (orig) await fs.unlink(path.join(ORIGINALS_DIR, orig));
    }),
  ]);
}
