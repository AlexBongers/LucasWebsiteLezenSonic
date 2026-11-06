import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './app/thema.css';
import { mount } from 'svelte';
import App from './app/App.svelte';

const app = mount(App, { target: document.getElementById('app')! });

export default app;
