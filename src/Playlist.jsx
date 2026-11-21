// song list. Click a song to play it.

import { useEffect, useRef } from 'react';

export default function Playlist({ tracks, current, search, onSelect }) {
  const listRef = useRef(null);

  // scroll so the playing song is always visible
  useEffect(() => {
    listRef.current.querySelector('.playing')?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  // build the text of each row, remembering its real position in the full list
  const rows = tracks.map((track, index) => ({
    index,
    label: track.artist ? `${track.artist} – ${track.title}` : track.title
  }));

  // keep only the rows that match the search box
  const visibleRows = rows.filter((row) =>
    row.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel playlist-box">
      <ul className="playlist" ref={listRef}>
        {visibleRows.map((row) => (
          <li
            key={row.index}
            className={row.index === current ? 'playing' : ''}
            onClick={() => onSelect(row.index)}
          >
            {row.label}
          </li>
        ))}

        {/* message when there is nothing to show */}
        {visibleRows.length === 0 && (
          <li className="message">
            {tracks.length ? 'No results.' : 'Click "Folder" and choose your music.'}
          </li>
        )}
      </ul>
    </div>
  );
}
