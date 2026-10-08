/* =====================================================
   NotaLista — Sefaz: leitura real do QR code da NFC-e
   O QR oficial da NFC-e (modelo 65) é uma URL:
     https://dfe-portal.svrs.rs.gov.br/NFCE/ConsultaInfoQRCode
       ?chVM=1&chNFe=4426...-58&nVersao=100&tpAmb=1
       &cDest=000...&dhEmi=3226...&vNF=123.45&vICMS=...
       &digVal=...&cIdToken=000001&cHashQRCode=...
   Dessa URL extraímos DADOS REAIS da nota:
     - chave de acesso (validada por dígito verificador mod-11)
     - CNPJ do emitente, UF, data de emissão, valor total
   Os ITENS completos exigem a consulta autenticada Sefaz
   (gov.br) — feita pelo proxy serverless (sefazProxy).
   ===================================================== */
(function(){
'use strict';

window.NL = window.NL || {};

/* ---------- utilidades ---------- */
function onlyDigits(s){ return (s||'').replace(/\D+/g,''); }

/* DV da chave de acesso NFC-e: módulo 11, peso 2..9 da direita p/ esquerda */
function validateKeyDv(ch43){
  var body = ch43.slice(0,43), dv = +ch43.slice(43);
  if (body.length !== 43) return false;
  var weights = [2,3,4,5,6,7,8,9];
  var sum = 0;
  for (var i = body.length - 1, w = 0; i >= 0; i--, w++) {
    sum += +body[i] * weights[w % 8];
  }
  var calc = 11 - (sum % 11);
  if (calc >= 10) calc = 0;
  return calc === dv;
}

var UFS = {
  '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
  '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL',
  '28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR',
  '42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'
};

/* parse do conteúdo escaneado */
function parseQR(text){
  var url = (text||'').trim();
  if (!/^https?:\/\//i.test(url)) {
    return { ok:false, error:'O QR code não é uma URL de NFC-e.' };
  }
  var u;
  try { u = new URL(url); } catch(e) { return { ok:false, error:'URL do QR inválida.' }; }

  var p = u.searchParams;
  var chave = onlyDigits(p.get('chNFe') || p.get('chaveAcesso') || p.get('chNFE') || '');

  if (!chave) {
    // alguns portais usam path param; tenta extrair 44 dígitos da URL toda
    var m = url.match(/(\d{44})/);
    if (m) chave = m[1];
  }
  if (!chave) return { ok:false, error:'QR sem chave de acesso de NFC-e.' };
  if (chave.length !== 44) return { ok:false, error:'Chave com '+chave.length+' dígitos (esperado: 44).' };
  if (+chave.slice(20,22) !== 65) return { ok:false, error:'QR não é de NFC-e (modelo '+chave.slice(20,22)+').' };
  if (!validateKeyDv(chave)) return { ok:false, error:'Chave de acesso inválida (DV não confere) — QR falsificado ou mal lido.' };

  var dhEmi = onlyDigits(p.get('dhEmi') || '');
  var emissao = null;
  if (dhEmi.length >= 10) {
    // AAAAMMDDTHHMMSS ou AAAA-MM-DD...
    emissao = dhEmi.slice(0,4)+'-'+dhEmi.slice(4,6)+'-'+dhEmi.slice(6,8);
    if (dhEmi.length >= 12) emissao += ' '+dhEmi.slice(8,10)+':'+dhEmi.slice(10,12);
  }

  var cnpj = onlyDigits(chave.slice(2,14)); // CNPJ do emitente vem na chave
  var vNF = p.get('vNF'), vICMS = p.get('vICMS');

  return {
    ok: true,
    chave: chave,
    uf: UFS[chave.slice(0,2)] || '?',
    cnpj: cnpj,
    serie: chave.slice(22,25),
    numero: chave.slice(25,34),
    emissao: emissao,
    valorTotal: vNF ? +vNF : null,
    valorICMS: vICMS ? +vICMS : null,
    tpAmb: p.get('tpAmb') === '2' ? 'homologação' : 'produção',
    consultaUrl: url
  };
}

/* ---------- câmera + jsQR ---------- */
var stream = null, rafId = null;

function startCamera(videoEl, onDecode, onError){
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onError('Câmera não disponível neste navegador/contexto (precisa de HTTPS).');
    return;
  }
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width:{ideal:1280}, height:{ideal:720} },
    audio: false
  }).then(function(s){
    stream = s;
    videoEl.srcObject = s;
    videoEl.setAttribute('playsinline','true');
    videoEl.play();
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var last = '';
    function tick(){
      if (!stream) return;
      if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
        if (canvas.width) {
          ctx.drawImage(videoEl, 0, 0);
          try {
            var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts:'dontInvert' });
            if (code && code.data && code.data !== last) {
              last = code.data;
              onDecode(code.data);
              return; // decodificado: para o loop
            }
          } catch(e){}
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
  }).catch(function(err){
    onError(err && err.name === 'NotAllowedError'
      ? 'Permissão de câmera negada. Autorize no navegador.'
      : 'Câmera indisponível: ' + (err && err.message || err));
  });
}

function stopCamera(videoEl){
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (stream) { stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
  if (videoEl) videoEl.srcObject = null;
}

/* ---------- proxy Sefaz (itens completos) ---------- */
function fetchItems(note, cb){
  var cfg = window.NL_CONFIG || {};
  if (!cfg.sefazProxy) {
    cb(null, { items: [], reason:
      'A página de consulta da Sefaz exige login gov.br (CPF + senha), então os ITENS ' +
      'não podem ser lidos direto do navegador. Os dados reais da nota (chave validada, ' +
      'emitente, data e valor) vieram do QR. Configure o proxy (functions/sefaz-proxy.js) ' +
      'para trazer os itens completos.' });
    return;
  }
  fetch(cfg.sefazProxy, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ chave: note.chave, url: note.consultaUrl })
  })
  .then(function(r){ if(!r.ok) throw new Error('proxy '+r.status); return r.json(); })
  .then(function(data){ cb(data.items || [], null); })
  .catch(function(e){ cb(null, { error:'Falha no proxy Sefaz: '+e.message }); });
}

NL.sefaz = {
  parseQR: parseQR,
  validateKeyDv: validateKeyDv,
  startCamera: startCamera,
  stopCamera: stopCamera,
  fetchItems: fetchItems
};
})();
