//starts React and shows <App /> inside the page.


import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './themes.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
