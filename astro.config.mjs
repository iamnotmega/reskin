import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://iamnotmega.github.io/reskin/',
  base: '/reskin/',
  integrations: [
    starlight({
      title: 'Reskin',
      logo: { src: './src/assets/logo.svg', replacesTitle: true },
      social: { github: 'https://github.com/iamnotmega/reskin' },
      sidebar: [
        {
          label: 'Quick Start',
          items: [
            { label: 'What is Reskin?', slug: 'guides/quick-start/about' },
            { label: 'Prerequisites', slug: 'guides/quick-start/prerequisites' },
            { label: 'Installation', slug: 'guides/quick-start/installation' },
          ],
        },
      ],
    }),
    mdx(),
  ],
});
