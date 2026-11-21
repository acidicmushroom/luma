// main component
// it holds the state (what the app knows) and the actions (what the buttons do).

import { useEffect, useRef, useState } from 'react';
import Visualizer from './Visualizer.jsx';
import Playlist from './Playlist.jsx';


//settings

//add a your theme here and in the themes.css file
const THEMES = [
  { id: 'xp', name: 'Windows XP' },
  { id: 'winamp', name: 'Winamp' }
];

//read / write settings that are remembered between sessions
function loadSetting(name, fallback) {
  return localStorage.getItem('luma_' + name) ?? fallback;
}
function saveSetting(name, value) {
  localStorage.setItem('luma_' + name, value);
}

//audio file types we accept
const AUDIO_FILE = /\.(mp3|m4a|aac|flac|wav|ogg|opus|wma)$/i;

// 125 seconds -> "2:05"
function formatTime(seconds) {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${minutes}:${secs}`;
}

//turns a file into a track with a title and an artist.
function makeTrack(file) {
  const name = file.name
    .replace(/\.[^.]+$/, '')          // remove ".mp3"
    .replace(/^\d+[\s.\-_]+/, '');    // remove the leading number
  const parts = name.split(' - ');

  if (parts.length > 1) {
    return { file, artist: parts[0], title: parts.slice(1).join(' - ') };
  }
  return { file, artist: '', title: name };
}

//App

export default function App() {
  // Refs: direct access to an element (no re-render when they change)
  const audioRef = useRef(null);         // the <audio> element
  const folderInputRef = useRef(null);   // the hidden folder picker

  // State: when one of these changes, the screen updates
  const [tracks, setTracks] = useState([]);         // all songs
  const [current, setCurrent] = useState(-1);       // position of the playing song (-1 = none)
  const [audioUrl, setAudioUrl] = useState('');     // temporary address of the playing file
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(Number(loadSetting('volume', 80)));
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');      // 'off' | 'all' | 'one'
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState(() => {
    const saved = loadSetting('theme', 'xp');
    return THEMES.some((t) => t.id === saved) ? saved : 'xp';
  });

  const track = tracks[current];   //the playing song (undefined if none)

 //effects

  //when the volume changes: apply it to the audio and remember it
  useEffect(() => {
    audioRef.current.volume = volume / 100;
    saveSetting('volume', volume);
  }, [volume]);

  //when the theme changes: remember it
  useEffect(() => saveSetting('theme', theme), [theme]);

  //show the song name as the window title
  useEffect(() => {
    document.title = track ? track.title : 'Luma';
  }, [track]);


  //actions: what the buttons do

  //the user picked a folder: keep the audio files and play the first one
  function loadFolder(files) {
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || AUDIO_FILE.test(f.name)
    );

    //sort by path; "numeric" puts song 2 before song 10
    audioFiles.sort((a, b) =>
      a.webkitRelativePath.localeCompare(b.webkitRelativePath, undefined, { numeric: true })
    );

    const newTracks = audioFiles.map(makeTrack);
    setTracks(newTracks);
    setCurrent(-1);
    playTrack(0, newTracks);   // we pass the list because "tracks" has not updated yet
  }

  //play the song at this position
  function playTrack(index, list = tracks) {
    if (!list[index]) return;

    if (audioUrl) URL.revokeObjectURL(audioUrl);                 // free the old address
    setAudioUrl(URL.createObjectURL(list[index].file));          // <audio autoPlay> starts it
    setCurrent(index);
  }

  function togglePlay() {
    if (current === -1) {
      //nothing loaded yet: play the first song, or open the folder picker
      if (tracks.length > 0) playTrack(0);
      else folderInputRef.current.click();
      return;
    }
    const audio = audioRef.current;
    if (audio.paused) audio.play(); else audio.pause();
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    const next = shuffle
      ? Math.floor(Math.random() * tracks.length)   // a random song
      : (current + 1) % tracks.length;              // the next one (wraps to the start)
    playTrack(next);
  }

  function previousTrack() {
    if (tracks.length === 0) return;
    //after 3 seconds, "previous" restarts the song instead
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    playTrack((current - 1 + tracks.length) % tracks.length);
  }

  //runs when a song finishes by itself
  function handleEnded() {
    if (repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    const isLastSong = current === tracks.length - 1;
    if (isLastSong && repeat === 'off' && !shuffle) return;   // stop at the end
    nextTrack();
  }

  function cycleRepeat() {
    const order = ['off', 'all', 'one'];
    setRepeat(order[(order.indexOf(repeat) + 1) % order.length]);
  }

  function cycleTheme() {
    const i = THEMES.findIndex((t) => t.id === theme);
    setTheme(THEMES[(i + 1) % THEMES.length].id);
  }

  //the user moves the progress bar: jump to that time
  function seek(seconds) {
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }

  

  // window.electronAPI exists only inside Electron
  const windowApi = window.electronAPI;

  return (
    <div className="window" data-theme={theme}>

      
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={handleEnded}
      />

      {/*title bar: drag it to move the window */}
      <header className="titlebar">
        <span>♫ Luma</span>
        <div className="titlebar-buttons">
          <select value={theme} onChange={(e) => setTheme(e.target.value)} title="Theme (T)">
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={() => windowApi?.minimize()} title="Minimize">–</button>
          <button onClick={() => windowApi?.close()} title="Close">✕</button>
        </div>
      </header>

      <main className="content">
        <Visualizer audioRef={audioRef} />

        {/* Song name */}
        <div className="panel">
          <div className="song-title">{track ? track.title : 'No music'}</div>
          <div className="song-artist">
            {track ? track.artist || 'Unknown artist' : 'Choose a folder to start'}
          </div>
        </div>

        {/* Progress bar */}
        <div className="row">
          <small>{formatTime(currentTime)}</small>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <small>{formatTime(duration)}</small>
        </div>

        {/* buuttons */}
        <div className="row center big-buttons">
          <button className={shuffle ? 'on' : ''} onClick={() => setShuffle(!shuffle)} title="Shuffle (S)">🔀</button>
          <button onClick={previousTrack} title="Previous (P)">⏮</button>
          <button className="on" onClick={togglePlay} title="Play / Pause (Space)">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={nextTrack} title="Next (N)">⏭</button>
          <button className={repeat !== 'off' ? 'on' : ''} onClick={cycleRepeat} title="Repeat (R)">
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>

        {/* volume */}
        <div className="row">
          🔈
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>

        {/* Folder button and search */}
        <div className="row">
          <button onClick={() => folderInputRef.current.click()}>📁 Folder</button>
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Playlist tracks={tracks} current={current} search={search} onSelect={playTrack} />

        <small>{tracks.length} tracks</small>
      </main>

      {/*hidden folder picker, opened by the "Folder" button */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        multiple
        hidden
        onChange={(e) => {
          loadFolder(e.target.files);
          e.target.value = '';   // lets you choose the same folder again later
        }}
      />
    </div>
  );
}
