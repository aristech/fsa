module.exports = {
  apps: [
    {
      name: 'progressnet-backend',
      script: './apps/backend/dist/server.js',
      cwd: '/var/www/progressnet.io-app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4005
      },
      error_file: '/var/log/pm2/progressnet-backend-error.log',
      out_file: '/var/log/pm2/progressnet-backend-out.log',
      log_file: '/var/log/pm2/progressnet-backend.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'progressnet-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/progressnet.io-app/apps/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4004
      },
      error_file: '/var/log/pm2/progressnet-frontend-error.log',
      out_file: '/var/log/pm2/progressnet-frontend-out.log',
      log_file: '/var/log/pm2/progressnet-frontend.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};