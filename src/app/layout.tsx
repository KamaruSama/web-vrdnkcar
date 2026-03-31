import './globals.css';
import type { Metadata } from 'next';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'ระบบจองรถสำนักงาน',
  description: 'ระบบจองรถสำนักงาน สำหรับศูนย์วิจัยและพัฒนาการสัตวแพทย์ภาคใต้ตอนบน',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
      </body>
    </html>
  );
}