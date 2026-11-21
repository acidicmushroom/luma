//starts React and shows <App /> inside the page.
//the visualizer can only connect to the audio once.)

import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './themes.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
