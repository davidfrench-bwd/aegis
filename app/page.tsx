export default function Home() {
  return (
    <main>
      <h1>Aegis Dashboard</h1>
      <p>Redirecting to automation rules...</p>
      <script dangerouslySetInnerHTML={{__html: `window.location.href='/app/apex/automation'`}} />
    </main>
  )
}