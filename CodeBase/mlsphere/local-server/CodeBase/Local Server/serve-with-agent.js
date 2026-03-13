const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const AGENT_PORT = Number(process.env.ML_AGENT_PORT || 51751);
const AGENT_HOST = process.env.ML_AGENT_HOST || '127.0.0.1';

function isPortOpen(host, port, timeoutMs = 800) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let settled = false;

    const done = result => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

function spawnAgent() {
  const agentPath = path.join(__dirname, 'server.js');
  const child = spawn(process.execPath, [agentPath], {
    cwd: path.join(__dirname, '..', '..', '..'),
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', code => {
    if (code !== 0 && code !== null) {
      console.warn(`[serve-with-agent] desktop agent exited with code ${code}`);
    }
  });

  return child;
}

function spawnWeb() {
  const cliServicePath = require.resolve('@vue/cli-service/bin/vue-cli-service.js');
  return spawn(process.execPath, [cliServicePath, 'serve'], {
    cwd: path.join(__dirname, '..', '..', '..'),
    stdio: 'inherit',
    env: process.env,
  });
}

(async () => {
  let agentProcess = null;

  const alreadyRunning = await isPortOpen(AGENT_HOST, AGENT_PORT);
  if (alreadyRunning) {
    console.log(`[serve-with-agent] desktop agent already active at ${AGENT_HOST}:${AGENT_PORT}`);
  } else {
    console.log('[serve-with-agent] starting desktop agent...');
    agentProcess = spawnAgent();
  }

  const webProcess = spawnWeb();

  const shutdown = signal => {
    console.log(`[serve-with-agent] received ${signal}, shutting down...`);

    if (webProcess && !webProcess.killed) {
      webProcess.kill();
    }

    if (agentProcess && !agentProcess.killed) {
      agentProcess.kill();
    }

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  webProcess.on('exit', code => {
    if (agentProcess && !agentProcess.killed) {
      agentProcess.kill();
    }
    process.exit(code || 0);
  });
})();
