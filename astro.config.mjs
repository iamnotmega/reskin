// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Reskin',
			logo: {
				src: './src/assets/logo.svg',
				replacesTitle: true,
			},
			social: {
				github: 'https://github.com/iamnotmega/reskin',
			},
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
	],
});
