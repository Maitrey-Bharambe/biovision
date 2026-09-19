import './globals.css';
import { SidebarProvider } from '../components/SidebarContext';
import { AppShell } from '../components/AppShell';

export const metadata = {
  title: 'BioVision — Your Intelligent Biotech Partner',
  description: 'Multi-omics data warehouse, data mining and computer vision for genomic discovery.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppShell>{children}</AppShell>
        </SidebarProvider>
      </body>
    </html>
  );
}
