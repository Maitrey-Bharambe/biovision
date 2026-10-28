import './globals.css';
import { SidebarProvider } from '../components/SidebarContext';
import { BioContextProvider } from '../components/BioContext';
import { AppShell } from '../components/AppShell';

export const metadata = {
  title: 'BioVision Intelligence',
  description: 'A multi-omics research workspace: data warehouse, live 3D OLAP cube, DNA editing bench, computer-vision explainability, and an AI investigation layer that keeps every number traceable.',
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
