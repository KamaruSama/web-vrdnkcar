import fs from 'fs';
import path from 'path';

export function register() {
  // สร้าง directories ที่จำเป็นตอน server เริ่มทำงาน
  const dirs = [
    path.join(process.cwd(), 'public', 'uploads', 'originals'),
    path.join(process.cwd(), 'backup-auto', 'manual'),
    path.join(process.cwd(), 'backup-auto', 'daily'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created: ${dir.replace(process.cwd(), '.')}`);
    }
  }
}
