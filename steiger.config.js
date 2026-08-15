import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ['./apps/admin/src/shared/**'],
    rules: {
      'fsd/public-api': 'off',
    },
  },
])
