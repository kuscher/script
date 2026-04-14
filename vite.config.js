import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Script Text Editor',
        short_name: 'Script',
        description: 'A fast, lightweight plain text editor.',
        theme_color: '#FAFAF8',
        background_color: '#FAFAF8',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/plain': ['.txt'],
              'text/markdown': ['.md'],
              'text/rtf': ['.rtf']
            }
          }
        ]
      }
    })
  ]
});
