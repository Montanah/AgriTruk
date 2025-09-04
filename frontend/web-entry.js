// Web-specific entry point to avoid native component and Firebase issues
import { registerRootComponent } from 'expo';
import App from './App.web.minimal';

// Register the main component
registerRootComponent(App);
