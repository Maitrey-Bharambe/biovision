import './globals.css';
import { SidebarProvider } from '../components/SidebarContext';
import { BioContextProvider } from '../components/BioContext';
import { AppShell } from '../components/AppShell';

export const metadata = {
  title: 'BioVision — The Daily Omics',
  description: 'A multi-omics data warehouse, OLAP intelligence platform and DNA editing laboratory, printed as an editorial.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <BioContextProvider>
            <AppShell>{children}</AppShell>
          </BioContextProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
