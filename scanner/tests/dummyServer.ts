import express from 'express';

const app = express();

app.get('/', (req, res) => {
  // Vulnerable endpoint: missing HSTS, exposed server banner
  res.setHeader('X-Powered-By', 'Express');
  res.setHeader('Server', 'nginx/1.18.0');
  res.send('Hello World');
});

app.get('/secure', (req, res) => {
  // Secure endpoint: has HSTS, clickjacking protection
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.send('Secure World');
});

export function startDummyServer(port: number): Promise<any> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}
