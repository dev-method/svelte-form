import App from './App.svelte';
import settings from "./env.js";

const app = new App({
	target: document.getElementById(settings.dom_id),
});

window.app = app;

export default app;