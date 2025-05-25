import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'HTML to Video Converter',
  description: 'Convert your HTML content to video easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
