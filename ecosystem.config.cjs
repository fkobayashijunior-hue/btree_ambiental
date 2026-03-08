module.exports = {
  apps: [
    {
      name: "btree-ambiental",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
