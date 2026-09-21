// Vercel project Root Directory: gavel. No database or Latch secrets on Vercel.
const value = process.env.RAILWAY_BACKEND_URL;
if (!value) throw new Error('Set RAILWAY_BACKEND_URL in the Vercel project environment.');
const backend = new URL(value);
if (backend.protocol !== 'https:' || backend.username || backend.password ||
    backend.search || backend.hash || backend.pathname !== '/')
  throw new Error('RAILWAY_BACKEND_URL must be an HTTPS origin without credentials, path or query.');
export const config = {
  framework: 'vite',
  installCommand: 'npm ci',
  buildCommand: 'npm run build -w frontend',
  outputDirectory: 'frontend/dist',
  rewrites: [
    { source: '/api/:path*', destination: backend.origin + '/api/:path*' },
    { source: '/((?!api(?:/|$)).*)', destination: '/index.html' }
  ]
};
