module.exports = {
  apps: [
   
    // ==========================================
    // CONFIGURATION (avni.mabsolinfotech.cloud)
    // Runs on Port 3004 to prevent conflicts with other services
    // ==========================================
    {
      name: "avni-crm",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3004",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      autorestart: true,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        PORT: 3004,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3004,
      },
      // Centralized PM2 logs
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
