
import { useEffect, useRef, useState } from 'react';
import Visualizer from './Visualizer.jsx';
import Playlist from './Playlist.jsx';
import Converter from './Converter.jsx';
import Settings from './Settings.jsx';
import Icon from './Icon.jsx';


// to add a theme, add it here and in themes.css
const THEMES = [
  { id: 'xp', name: 'Windows XP' },
  { id: 'winamp', name: 'Winamp' },
  { id: 'aero', name: 'Frutiger Aero' }
];

// reAD / write settings that are remembered between sessions
function loadSetting(name, fallback) {
  return localStorage.getItem('luma_' + name) ?? fallback;
}
function saveSetting(name, value) {
  localStorage.setItem('luma_' + name, value);
}

// audio file types we accept
const AUDIO_FILE = /\.(mp3|m4a|aac|flac|wav|ogg|opus|wma)$/i;

// 125 seconds -> "2:05"
function formatTime(seconds) {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${minutes}:${secs}`;
}

// Turns a file into a track with a title and an artist.
// "01 - Daft Punk - Around the World.mp3" -> artist "Daft Punk", title "Around the World"
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


// find the folder and remove the name
function getFolderPath(file) {
  const fullPath = window.electronAPI?.getFilePath(file);
  if (!fullPath) return '';

  const separator = fullPath.includes('\\') ? '\\' : '/';
  const parts = fullPath.split(/[\\/]/);
  const levelsToRemove = file.webkitRelativePath.split('/').length - 1;
  return parts.slice(0, parts.length - levelsToRemove).join(separator);
}

export default function App() {
  //direct access to an element (no re-render when they change)
 
  // the <audio> element
  const audioRef = useRef(null);       
 
  // the hidden folder picker
  const folderInputRef = useRef(null);  

  //when one of these changes, the screen updates
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
  const [view, setView] = useState('playlist');     // 'playlist' | 'convert' | 'settings'
  const [folderPath, setFolderPath] = useState('');   // where the open folder is on the disk
  const [sleepMinutes, setSleepMinutes] = useState(0);          // sleep timer (0 = off)
  const [secondsLeft, setSecondsLeft] = useState(0);            // time left on the timer
  const [theme, setTheme] = useState(() => {
    const saved = loadSetting('theme', 'xp');
    return THEMES.some((t) => t.id === saved) ? saved : 'xp';
  });

  // the playing song
  const track = tracks[current];   


  // when thw audio changes apply it to the audio and remember it
  useEffect(() => {
    audioRef.current.volume = volume / 100;
    saveSetting('volume', volume);
  }, [volume]);

  // rember when theme changes
  useEffect(() => saveSetting('theme', theme), [theme]);

  // when the time is up, pause the music.
  // runs again whenever the user changes the timer
  useEffect(() => {
    if (sleepMinutes === 0) {
      setSecondsLeft(0);
      return;
    }

    const endTime = Date.now() + sleepMinutes * 60 * 1000;
    setSecondsLeft(sleepMinutes * 60);

    const interval = setInterval(() => {
      const left = Math.round((endTime - Date.now()) / 1000);
      if (left <= 0) {
        audioRef.current.pause();
        setSleepMinutes(0);           
      } else {
        setSecondsLeft(left);
      }
    }, 1000);

    return () => clearInterval(interval);   
  }, [sleepMinutes]);

  // show the song name as the window title
  useEffect(() => {
    document.title = track ? track.title : 'Luma';
  }, [track]);

  // keyboard shortcuts 
  useEffect(() => {
    function onKeyDown(e) {
      //ignore keys while typing in the search box or using a dropdown
      if (e.target.matches('input[type="search"], select')) return;

      const audio = audioRef.current;
      switch (e.key.toLowerCase()) {
        case ' ':          e.preventDefault(); e.target.blur(); togglePlay(); break;
        case 'arrowright': audio.currentTime += 5; break;
        case 'arrowleft':  audio.currentTime -= 5; break;
        case 'arrowup':    e.preventDefault(); setVolume(Math.min(100, volume + 5)); break;
        case 'arrowdown':  e.preventDefault(); setVolume(Math.max(0, volume - 5)); break;
        case 'n': nextTrack(); break;
        case 'p': previousTrack(); break;
        case 's': setShuffle(!shuffle); break;
        case 'r': cycleRepeat(); break;
        case 't': cycleTheme(); break;
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });


  // folder picked by user
  function loadFolder(files) {
    const audioFiles = Array.from(files).filter(
      (f) => f.type.startsWith('audio/') || AUDIO_FILE.test(f.name)
    );

    // sort by path
    audioFiles.sort((a, b) =>
      a.webkitRelativePath.localeCompare(b.webkitRelativePath, undefined, { numeric: true })
    );

    const newTracks = audioFiles.map(makeTrack);

    // converted and added songs are saved there
    if (files.length > 0) setFolderPath(getFolderPath(files[0]));
    setTracks(newTracks);
    setCurrent(-1);
    playTrack(0, newTracks);   
  }

  // Add one song to the end of the playlist
  function addTrack(file) {
    setTracks((oldTracks) => [...oldTracks, makeTrack(file)]);
  }

  // play the song at this position
  function playTrack(index, list = tracks) {
    if (!list[index]) return;

    if (audioUrl) URL.revokeObjectURL(audioUrl);                 
    setAudioUrl(URL.createObjectURL(list[index].file));         
    setCurrent(index);
  }

  function togglePlay() {
    if (current === -1) {
      //play the first song, or open the folder picker 
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
      ? Math.floor(Math.random() * tracks.length)   
      : (current + 1) % tracks.length;              
    playTrack(next);
  }

  function previousTrack() {
    if (tracks.length === 0) return;
    // After 3 seconds, the previous buttonn restarts the song instead
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    playTrack((current - 1 + tracks.length) % tracks.length);
  }

  // run when a song finishes by itself
  function handleEnded() {
    if (repeat === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    const isLastSong = current === tracks.length - 1;
    if (isLastSong && repeat === 'off' && !shuffle) return;   
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

  // window.electronAPI exists only inside Electron (see electron/preload.js)
  const windowApi = window.electronAPI;

  return (
    <div className="window" data-theme={theme}>

      {/* The real audio player*/}
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

      {/*  drag the title bar to move the window */}
      <header className="titlebar">
        <span className="logo"><Icon name="music" /> Luma</span>
        <div className="titlebar-buttons">
          <select value={theme} onChange={(e) => setTheme(e.target.value)} title="Theme (T)">
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button onClick={() => windowApi?.minimize()} title="Minimize"><Icon name="minimize" size={14} /></button>
          <button onClick={() => windowApi?.close()} title="Close"><Icon name="close" size={14} /></button>
        </div>
      </header>

      <main className="content">
        <Visualizer audioRef={audioRef} />

        {/* song name */}
        <div className="panel">
          <div className="song-title">{track ? track.title : 'No music'}</div>
          <div className="song-artist">
            {track ? track.artist || 'Unknown artist' : 'Choose a folder to start'}
          </div>
        </div>

        {/* progress bar */}
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

        {/*buttons */}
        <div className="row center big-buttons">
          <button className={shuffle ? 'on' : ''} onClick={() => setShuffle(!shuffle)} title="Shuffle (S)"><Icon name="shuffle" size={20} /></button>
          <button onClick={previousTrack} title="Previous (P)"><Icon name="previous" size={20} /></button>
          <button className="on" onClick={togglePlay} title="Play / Pause (Space)">
            <Icon name={isPlaying ? 'pause' : 'play'} size={20} />
          </button>
          <button onClick={nextTrack} title="Next (N)"><Icon name="next" size={20} /></button>
          <button className={repeat !== 'off' ? 'on' : ''} onClick={cycleRepeat} title="Repeat (R)">
            <Icon name={repeat === 'one' ? 'repeat-one' : 'repeat'} size={20} />
          </button>
        </div>

        {/* volume */}
        <div className="row">
          <Icon name="volume" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>

        {/* timwer*/}
        <div className="row">
          <Icon name="timer" />
          <select value={sleepMinutes} onChange={(e) => setSleepMinutes(Number(e.target.value))}>
            <option value="0">Sleep timer: off</option>
            <option value="5">Stop in 5 min</option>
            <option value="15">Stop in 15 min</option>
            <option value="30">Stop in 30 min</option>
            <option value="45">Stop in 45 min</option>
            <option value="60">Stop in 60 min</option>
            <option value="90">Stop in 90 min</option>
          </select>
          {sleepMinutes > 0 && <small>{formatTime(secondsLeft)} left</small>}
        </div>

        {/* folder button and search*/}
        <div className="row">
          <button onClick={() => folderInputRef.current.click()}><Icon name="folder" /> Folder</button>
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* show the playlist, the converter or the settings */}
        {view === 'playlist' && (
          <Playlist tracks={tracks} current={current} search={search} onSelect={playTrack} />
        )}
        {view === 'convert' && <Converter />}
        {view === 'settings' && <Settings folder={folderPath} onSongAdded={addTrack} />}

        {/* clicking the active button again goes back to the playlist */}
        <div className="row footer">
          <small>{tracks.length} tracks</small>
          <div className="row">
            <button
              className={view === 'convert' ? 'on' : ''}
              onClick={() => setView(view === 'convert' ? 'playlist' : 'convert')}>
              <Icon name="convert" /> Convert
            </button>
            <button
              className={view === 'settings' ? 'on' : ''}
              onClick={() => setView(view === 'settings' ? 'playlist' : 'settings')}>
              <Icon name="settings" /> Settings
            </button>
          </div>
        </div>
      </main>

      {/* hidden folder picker */}
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
