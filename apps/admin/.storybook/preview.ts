import type { Preview } from '@storybook/react-vite'
import '@empreint/ui/styles.css'
import '../src/app/styles/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
