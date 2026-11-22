

import { useState } from 'react';

export default function Converter() {
  const [url, setUrl] = useState('');   

  return (
    <div className="panel converter">
      <strong>YouTube → MP3</strong>
      <input
        type="text"
        placeholder="Paste a YouTube link..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button>Download MP3</button>

      <strong>Video → MP3</strong>
      <button>Choose MP4 file(s)...</button>
    </div>
  );
}
