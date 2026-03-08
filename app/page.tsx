export default function Home() {
  return (
    <main>
      <h1>Aegis Dashboard</h1>
      <p>Redirecting...</p>
      <script dangerouslySetInnerHTML={{__html: `window.location.href='/dashboard.html'`}} />
    </main>
  )
}