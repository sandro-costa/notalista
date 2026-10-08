/* NotaLista — service worker (cache simples, sem dependências) */
var CACHE='notalista-v2';
var ASSETS=[
  './','./index.html','./app.html','./auth.html','./manifest.json',
  './css/style.css','./css/app.css',
  './js/config.js','./js/auth.js','./js/sefaz.js','./js/landing.js','./js/app.js',
  './img/icon.svg'
];
/* libs em CDN (supabase-js, jsQR) entram no cache no primeiro acesso */
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
  }));
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      return hit||fetch(e.request).then(function(res){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,copy)});
        return res;
      }).catch(function(){return caches.match('./app.html')});
    })
  );
});
