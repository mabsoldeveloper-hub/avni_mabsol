module.exports = {
  apps: [
    {
      name: "mabsolcrm",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "2G",
      node_args: "--max-old-space-size=4096",
      autorestart: true,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
      // Centralized PM2 logs
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
