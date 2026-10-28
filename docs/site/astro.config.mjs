import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { readFileSync } from 'node:fs';
const selection = JSON.parse(readFileSync(new URL('../knowledge-base/publication.json', import.meta.url)));
export default defineConfig({
  site: 'https://wstein.github.io',
  base: '/puzlwerk',
  trailingSlash: 'always',
  integrations: [starlight({
    title: 'PuzlWerk',
    description: 'Shared twisty-puzzle engineering knowledge and scoped solver reference.',
    social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wstein/puzlwerk' }],
    sidebar: [
      { label: 'Overview', slug: '' },
      ...selection.views.developer.map(group => ({ label: group.label, items: group.notes.map(id => ({ slug: `notes/${id}` })) })),
      { label: 'Reference and guides', items: selection.documents.map(d => ({ slug: d.slug })) },
    ],
  })],
});
