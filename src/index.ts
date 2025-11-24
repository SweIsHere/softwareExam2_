import { runCli } from './app/cli.js';

runCli().catch((error) => {
  console.error('No se pudo iniciar la aplicación.', error);
  process.exitCode = 1;
});
