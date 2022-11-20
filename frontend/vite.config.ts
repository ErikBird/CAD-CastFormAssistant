import {defineConfig} from 'vite'
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue'
import {comlink} from 'vite-plugin-comlink'

import * as path from "path";
// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from 'vite-plugin-vuetify'
// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
      alias: [
        {
          find: '@',
          replacement: resolve(__dirname, './src'),
        },
      ],
    },
    plugins: [
        vue(),
        comlink(),
        vuetify({autoImport: true}),
    ],
    worker: {
        plugins: [
            comlink()
        ]
    },
    base: '/CAD-CastFormAssistant/'
})

