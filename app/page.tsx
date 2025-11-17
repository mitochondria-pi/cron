export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Health Checker</h1>
      <p>Monitoring <a href="https://www.kahani.xyz/" target="_blank" rel="noopener noreferrer">kahani.xyz</a></p>
      <p>Health checks run automatically via Vercel cron jobs every 5 minutes (with randomized intervals).</p>
      <p>Check the <code>/api/health-check</code> endpoint to view health check results.</p>
    </main>
  );
}

