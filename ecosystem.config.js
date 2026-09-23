module.exports = {
  apps: [
    // ==========================================
    // PREVIOUS / OLD CONFIGURATION (COMMENTED OUT)
    // ==========================================
    /*
    {
      name: "mabsol-crm",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max",           // Runs on all CPU cores (Cluster mode)
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      }
    },
    */

    // ==========================================
    // NEW CONFIGURATION (mbh.crm.mabsolinfotech.cloud)
    // Runs on Port 3003 to prevent conflicts with other services
    // ==========================================
    {
      name: "mbh-crm",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3003",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      autorestart: true,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: "production",
        PORT: 3003,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3003,
      },
      // Centralized PM2 logs
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
