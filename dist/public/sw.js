/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-8c83623c'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "pwa-512-v3.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "pwa-192.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "pwa-192-v3.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "index.html",
    "revision": "47ea1a43f156e718ff17eb4e236b8e47"
  }, {
    "url": "icon-btree-512.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "icon-btree-192.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "assets/xlsx-DGuHH-KN.js",
    "revision": null
  }, {
    "url": "assets/index-Cgei_Kqm.js",
    "revision": null
  }, {
    "url": "assets/index-BeQYXvGa.css",
    "revision": null
  }, {
    "url": "__manus__/debug-collector.js",
    "revision": "45b1e83bacf2dc3d3b20bb18b465abe0"
  }, {
    "url": "icon-btree-192.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "icon-btree-512.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "pwa-192-v3.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "pwa-192.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "pwa-512-v3.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "pwa-512.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "manifest.webmanifest",
    "revision": "3b0d06f7fb4c4f99f80bd6a344cdbead"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(/^\/api\/trpc\//, new workbox.NetworkFirst({
    "cacheName": "trpc-cache",
    "networkTimeoutSeconds": 5,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 200,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\//, new workbox.StaleWhileRevalidate({
    "cacheName": "external-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 86400
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
