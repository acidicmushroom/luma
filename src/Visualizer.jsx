// The animated bars that move with the music.
//
// How it works:
//   1. An "analyser" listens to the audio and gives us the volume of each frequency.
//   2. 60 times per second we read those numbers and draw one bar per number.

import { useEffect, useRef } from 'react';

export default function Visualizer({ audioRef }) {
  const canvasRef = useRef(null);

  //runs once, when the visualizer appears on screen
  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const pen = canvas.getContext('2d');

    //connect:  <audio>  ->  analyser  ->  speakers
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;                      // gives us 64 numbers
    source.connect(analyser);
    analyser.connect(context.destination);       // so you can still hear the music
    audio.addEventListener('play', () => context.resume());

    const levels = new Uint8Array(analyser.frequencyBinCount);   // the 64 numbers (0-255)
    const barCount = 48;                         // the highest frequencies barely move, so skip them
    let frameId;

    function draw() {
      frameId = requestAnimationFrame(draw);     // call draw() again on the next frame

      //match the drawing size to the real size on screen (this also clears the canvas)
      const width = (canvas.width = canvas.clientWidth);
      const height = (canvas.height = canvas.clientHeight);

      // colors come from the theme (--viz1 and --viz2 in themes.css)
      const style = getComputedStyle(canvas);
      const gradient = pen.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, style.getPropertyValue('--viz1').trim());
      gradient.addColorStop(1, style.getPropertyValue('--viz2').trim());
      pen.fillStyle = gradient;

      // get the current numbers and draw one bar for each
      analyser.getByteFrequencyData(levels);
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const barHeight = (levels[i] / 255) * height;
        pen.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      }
    }
    draw();

    // stop drawing when the visualizer goes away
    return () => cancelAnimationFrame(frameId);
  }, [audioRef]);

  return <canvas ref={canvasRef} className="visualizer" />;
}
