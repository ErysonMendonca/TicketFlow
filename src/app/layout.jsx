import '../App.css'

export const metadata = {
  title: 'TynkeTech',
  description: 'Sistema administrativo de chamados',
  icons: {
    icon: '/TynkeTech.png'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
