module.exports = {
  apps: [{
    name: 'eps-dashboard',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1.5G',
    node_args: '--max-old-space-size=1536',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}