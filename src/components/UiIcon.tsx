// Inlines the project's SVG icon set (icons/ui/*.svg) so they inherit
// currentColor for theming. Loaded at build time by Vite.
const raw = import.meta.glob('../../icons/ui/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const byName: Record<string, string> = {};
for (const p in raw) {
  const m = p.match(/([^/]+)\.svg$/);
  if (m) byName[m[1]] = raw[p];
}

export function UiIcon({ name }: { name: string }) {
  const svg = byName[name];
  return svg ? <span className="ui-ico" dangerouslySetInnerHTML={{ __html: svg }} /> : null;
}
