type HealthResponse = {
  status: string;
  message: string;
};

export default async function Home() {
  let apiData: HealthResponse | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(
      'http://localhost:3000/health',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    apiData = await response.json();
  } catch {
    error = 'Unable to connect to the Express API.';
  }

  return (
    <main style={{ padding: '32px', fontFamily: 'Arial' }}>
      <h1>DevHub</h1>
      <h2>Backend Connection</h2>

      {apiData ? (
        <div>
          <p>Status: {apiData.status}</p>
          <p>Message: {apiData.message}</p>
        </div>
      ) : (
        <p>{error}</p>
      )}
    </main>
  );
}