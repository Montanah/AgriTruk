// Web-specific entry point to avoid native component and Firebase issues
import { registerRootComponent } from 'expo';
import App from './App';

// Register the main component (App.tsx now handles web platform detection)
registerRootComponent(App);
