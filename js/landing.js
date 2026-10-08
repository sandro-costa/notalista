/* NotaLista — interações da landing */
(function(){
  // menu mobile
  var burger=document.querySelector('.hamburger');
  var nav=document.querySelector('.main-nav');
  if(burger&&nav){
    burger.addEventListener('click',function(){nav.classList.toggle('open')});
    nav.addEventListener('click',function(e){
      if(e.target.tagName==='A')nav.classList.remove('open');
    });
  }
  // banner de cookies
  var bar=document.getElementById('cookieBar');
  if(bar){
    if(localStorage.getItem('nl-cookies'))bar.hidden=true;
    bar.querySelectorAll('[data-choice]').forEach(function(b){
      b.addEventListener('click',function(){
        localStorage.setItem('nl-cookies',b.getAttribute('data-choice'));
        bar.hidden=true;
      });
    });
  }
})();
