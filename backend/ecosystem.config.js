module.exports = {
  apps: [
    {
      name: 'book-buddy-backend',
      script: 'node_modules/.bin/nest',
      args: 'start --watch',
      cwd: __dirname,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      watch: false, // NestJS --watch handles its own file watching
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
      exp_backoff_restart_delay: 100,
    },
  ],
};
