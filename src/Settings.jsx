
import { useState } from 'react';
import Icon from './Icon.jsx';

export default function Settings({ folder, onSongAdded }) {
  const api = window.electronAPI;            

  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  // let the user choose songs, copy them into the folder, add them to the playlist
  async function addSongs() {
    if (!api) return setStatus('This only works in the Luma desktop app.');
    if (!folder) return setStatus('Open a folder first: go back and click "Folder".');

     // opens the "choose files" window
    const paths = await api.pickSongs();    
    if (paths.length === 0) return;

    setBusy(true);
    let added = 0;
    try {
      for (const filePath of paths) {
        // copies the file
        const result = await api.addSong(filePath, folder);   
        if (!result.ok) {
          setStatus('Error: ' + result.error);
          return;
        }
        onSongAdded(new File([result.data], result.name, { type: result.type }));
        added++;
        setStatus(`Added ${added} of ${paths.length}...`);
      }
      setStatus(`Done! ${added} song(s) copied to the folder.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel settings">
      <strong>Current folder</strong>
      <small className="folder-path">{folder || 'No folder open yet'}</small>

      <strong>Add a song</strong>
      <button disabled={busy} onClick={addSongs}><Icon name="plus" /> Add song(s) from my files...</button>
      <small>The songs are copied into the current folder and added to the playlist.</small>

      <small className="status-text">{status}</small>
    </div>
  );
}
