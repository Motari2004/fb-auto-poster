import './globals.css'

export const metadata = {
  title: 'Facebook Auto-Poster',
  description: 'Automated Facebook posting from multiple sources',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}