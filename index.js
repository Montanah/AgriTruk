// Simple polyfill for Hermes URL.protocol support
if (global.HermesInternal && global.URL) {
  const OriginalURL = global.URL;

  // Create a wrapper class that adds protocol getter
  class URLPolyfill {
    constructor(urlString) {
      this._url = new OriginalURL(urlString);
      this._urlString = urlString;
      this._parseProtocol();
    }

    _parseProtocol() {
      const match = this._urlString.match(/^([a-z][a-z0-9+.-]*?):/i);
      this.protocol = match ? match[1] + ":" : "";
    }

    get href() {
      return this._url.href;
    }
    get hostname() {
      return this._url.hostname;
    }
    get pathname() {
      return this._url.pathname;
    }
    get search() {
      return this._url.search;
    }
    get hash() {
      return this._url.hash;
    }
    get port() {
      return this._url.port;
    }
    get username() {
      return this._url.username;
    }
    get password() {
      return this._url.password;
    }

    toString() {
      return this._url.toString();
    }
  }

  global.URL = URLPolyfill;
}

import { AppRegistry } from "react-native";
import App from "./App.tsx";

AppRegistry.registerComponent("main", () => App);
