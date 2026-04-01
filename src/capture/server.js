import { spawn } from 'child_process';

export async function startServer(serveConfig) {
  if (!serveConfig.command) {
    // No command — assume server is already running at serveConfig.url
    console.log(`  Using existing server at ${serveConfig.url}`);
    return null;
  }

  console.log(`  Starting server: ${serveConfig.command}`);

  const [cmd, ...args] = serveConfig.command.split(' ');
  const child = spawn(cmd, args, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: serveConfig.cwd || process.cwd(),
  });

  const readyPattern = serveConfig.readyPattern || 'Available on';

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(); // Proceed anyway after timeout
    }, 10000);

    const onData = (data) => {
      const text = data.toString();
      if (text.includes(readyPattern)) {
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start server: ${err.message}`));
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });

  console.log(`  Server ready at ${serveConfig.url}`);
  return child;
}

export function stopServer(child) {
  if (child) {
    child.kill();
    console.log('  Server stopped');
  }
}
