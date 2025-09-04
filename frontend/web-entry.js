// Web-specific entry point to avoid native component issues
import { registerRootComponent } from 'expo';
import App from './App.web.minimal';

// Register the main component
registerRootComponent(App);
