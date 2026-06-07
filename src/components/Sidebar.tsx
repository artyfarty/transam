import type { Torrent } from '../../shared/types';
import { CATEGORIES, collectLabels, type Filter } from '../filters';

interface Props {
  torrents: Torrent[];
  filter: Filter;
  onFilter: (f: Filter) => void;
  width: number;
}

export function Sidebar({ torrents, filter, onFilter, width }: Props) {
  const labels = collectLabels(torrents);
  return (
    <div className="sidebar" style={{ flex: `0 0 ${width}px` }}>
      {CATEGORIES.map((c) => {
        const count = c.id === 'all' ? torrents.length : torrents.filter(c.test).length;
        const active = filter.kind === 'cat' && filter.id === c.id;
        return (
          <div
            key={c.id}
            className={`side-item ${active ? 'active' : ''}`}
            onClick={() => onFilter({ kind: 'cat', id: c.id })}
          >
            <span>{c.label}</span>
            <span className="count">{count}</span>
          </div>
        );
      })}
      {labels.length > 0 && (
        <>
          <div className="side-head">Labels</div>
          {labels.map((l) => {
            const active = filter.kind === 'label' && filter.name === l.name;
            return (
              <div
                key={l.name}
                className={`side-item ${active ? 'active' : ''}`}
                onClick={() => onFilter({ kind: 'label', name: l.name })}
              >
                <span>{l.name}</span>
                <span className="count">{l.count}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
