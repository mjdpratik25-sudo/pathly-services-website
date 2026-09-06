// Vercel Serverless Function entry point.
// Imports the pre-built Express app (built by esbuild during buildCommand).
// Vercel invokes this as a serverless handler — no listen() call needed.
import app from '../artifacts/api-server/dist/app.mjs';
export default app;
