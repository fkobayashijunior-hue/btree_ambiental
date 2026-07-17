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
define(['./workbox-1fb923f4'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sima-logo.png",
    "revision": "79bedf5dc9d215d2fad2e8f1212e6f84"
  }, {
    "url": "pwa-collaborator-512.png",
    "revision": "66617113cb674ec16a9fefca7714cb50"
  }, {
    "url": "pwa-collaborator-192.png",
    "revision": "dd2372f17cdf6ff21cf06c295e1319a0"
  }, {
    "url": "pwa-client-512.png",
    "revision": "2902ec040a6cd78f11df1e37e1291fef"
  }, {
    "url": "pwa-client-192.png",
    "revision": "15949959c9db3ed6d78a93e08b17a08f"
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
    "revision": "64ace71d56606a5252886a5d5c5c7b3d"
  }, {
    "url": "icon-btree-512.png",
    "revision": "3c4a952dce1bc2de66ce03c1ab0dba9d"
  }, {
    "url": "icon-btree-192.png",
    "revision": "3f504e54ba9aa202f0bca871a50df851"
  }, {
    "url": "btree-logo-full.png",
    "revision": "34a190ddee9ab64ba00a5ddf6b4c4fc5"
  }, {
    "url": "btree-logo-full.png",
    "revision": "34a190ddee9ab64ba00a5ddf6b4c4fc5"
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
    "url": "pwa-client-192.png",
    "revision": "15949959c9db3ed6d78a93e08b17a08f"
  }, {
    "url": "pwa-client-512.png",
    "revision": "2902ec040a6cd78f11df1e37e1291fef"
  }, {
    "url": "pwa-collaborator-192.png",
    "revision": "dd2372f17cdf6ff21cf06c295e1319a0"
  }, {
    "url": "pwa-collaborator-512.png",
    "revision": "66617113cb674ec16a9fefca7714cb50"
  }, {
    "url": "sima-logo.png",
    "revision": "79bedf5dc9d215d2fad2e8f1212e6f84"
  }, {
    "url": "manifest.webmanifest",
    "revision": "50650fc8cb1d0ed3d2a25a02a18720da"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//, /LSCWP/, /nocache/, /\?.*=/, /\.js$/, /\.css$/]
  }));
  workbox.registerRoute(/\/assets\/.+\.(js|css)$/, new workbox.NetworkFirst({
    "cacheName": "assets-cache",
    "networkTimeoutSeconds": 10,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
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

}));
