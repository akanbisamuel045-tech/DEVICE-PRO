/**
 * DEVICE PRO — PM2 Production Process Manager Configuration
 * Provides zero-downtime clustering, automated log rotation, and memory limits.
 */

module.exports = {
  apps: [
    {
      name: 'device-pro',
      script: './server.js',
      instances: 'max', // Utilizes available CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
