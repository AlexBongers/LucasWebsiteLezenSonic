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

// Nieuwe versie? De app ververst zichzelf zodra de nieuwe service worker het overneemt,
// en kijkt bij elke terugkeer naar de app of er een nieuwe versie klaarstaat.
if ('serviceWorker' in navigator) {
  const had = !!navigator.serviceWorker.controller;
  let herlaad = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had || herlaad) return; // eerste installatie: niets te verversen
    herlaad = true;
    location.reload();
  });
  const zoek = () => navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void zoek();
  });
  window.addEventListener('focus', () => void zoek());
  void zoek();
}
