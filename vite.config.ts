import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // listen on 0.0.0.0
    port: 4200, // default Angular port
    allowedHosts: [
      'https://adequate-mustang-usefully.ngrok-free.app/', // your current ngrok URL
    ],
  },
});
