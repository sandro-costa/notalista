/**
 * NotaLista — Sefaz Proxy (fase 2: itens completos da NFC-e)
 *
 * A página pública de consulta da NFC-e (dfe-portal.svrs.rs.gov.br)
 * redireciona para login gov.br (SSO CPF). Por isso a leitura dos ITENS
 * não pode ser feita pelo navegador do usuário — precisa de um servidor
 * autenticado no gov.br. Este proxy faz esse papel.
 *
 * Deploy (escolha um):
 *   Cloudflare Worker:  wrangler deploy
 *   Vercel Edge:        vercel deploy  (arquivo em api/sefaz-proxy.js)
 *   VPS/Node:           node sefaz-proxy.js (porta 8787)
 *
 * Depois preencha NL_CONFIG.sefazProxy no js/config.js.
 *
 * CONTRATO: POST { chave: "44 dígitos", url: "<QR original>" }
 *           → 200 { items: [ { name, price, qty } ], store?, total? }
 *
 * AUTENTICAÇÃO GOV.BR: preencha GOVBR_CPF/GOVBR_SENHA como segredos
 * do ambiente (nunca no código). O fluxo é: GET ConsultaInfoQRCode →
 * segue redirect ao SSO → login CPF/senha → cookies → página do cupom
 * → parse dos itens. O SSO gov.br pode exigir 2FA/banco; nesse caso
 * use uma conta de serviço com 2FA por app (TOTP configurável).
 */

const SEFAZ_BASE = 'https://dfe-portal.svrs.rs.gov.br';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    if (request.method !== 'POST') return cors(new Response('POST only', { status: 405 }));

    const { chave, url } = await request.json();
    if (!chave || !/^\d{44}$/.test(chave))
      return cors(json({ error: 'chave inválida' }, 400));

    try {
      // 1) abre a URL do QR (segue redirect ao SSO gov.br)
      const cookieJar = {};
      let res = await fetch(url || `${SEFAZ_BASE}/NFCE/ConsultaInfoQRCode?chNFe=${chave}`, {
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NotaLista/1.0)' }
      });
      collectCookies(res, cookieJar);

      // 2) login gov.br (CPF/senha de conta de serviço)
      if (env.GOVBR_CPF && env.GOVBR_SENHA) {
        res = await govbrLogin(res, cookieJar, env, request);
      } else if (isSsoUrl(res.url || '')) {
        return cors(json({
          items: [],
          needsGovBr: true,
          message: 'Consulta de itens exige autenticação gov.br. Configure GOVBR_CPF/GOVBR_SENHA no proxy.'
        }));
      }

      // 3) carrega a página do cupom com cookies válidos
      res = await fetch(res.url || url, { headers: cookiesHeader(cookieJar) });
      const html = await res.text();

      // 4) parse dos itens da tabela do cupom
      const items = parseItems(html);
      const store = parseStore(html);
      return cors(json({ items, store, chave }));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 502));
    }
  }
};

function isSsoUrl(u){ return /acesso\.gov\.br|sso\./.test(u); }

function collectCookies(res, jar){
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  (set.length ? set : [].concat(res.headers.get('set-cookie') || [])).forEach(c => {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  });
}
function cookiesHeader(jar){
  return { Cookie: Object.entries(jar).map(([k,v]) => `${k}=${v}`).join('; ') };
}

async function govbrLogin(res, jar, env, request){
  // Fluxo SSO gov.br: captura csrf/flow-token do HTML e submete CPF → senha.
  // Implementação mínima; ajuste conforme o HTML vigente do SSO.
  let html = await res.text();
  const csrf = (html.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const action = (html.match(/<form[^>]*action="([^"]+)"/) || [])[1];

  const post = (actionUrl, body) => fetch(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...cookiesHeader(jar) },
    body: new URLSearchParams(body).toString(),
    redirect: 'manual'
  });

  let r = await post(action, { accountId: env.GOVBR_CPF, _csrf: csrf || '' });
  collectCookies(r, jar);
  html = await r.text();
  const csrf2 = (html.match(/name="_csrf" value="([^"]+)"/) || [])[1];
  const action2 = (html.match(/<form[^>]*action="([^"]+)"/) || [])[1];

  r = await post(action2 || action, { password: env.GOVBR_SENHA, _csrf: csrf2 || '' });
  collectCookies(r, jar);
  return r;
}

function parseItems(html){
  const items = [];
  // a página do cupom lista itens em tabela; seletores tolerantes
  const re = /<tr[^>]*class="[^"]*item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = re.exec(html))) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => strip(c[1]));
    if (cells.length >= 3) {
      items.push({
        name: cells[1] || cells[0],
        qty: num(cells[2]),
        price: num(cells[cells.length - 1])
      });
    }
  }
  return items;
}
function parseStore(html){
  const m = html.match(/class="[^"]*(razao|emitente)[^"]*"[^>]*>([^<]+)/i);
  return m ? m[2].trim() : null;
}
function strip(s){ return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function num(s){ return parseFloat((s || '').replace(/\./g, '').replace(',', '.')) || 0; }
function json(obj, status){ return new Response(JSON.stringify(obj), {
  status: status || 200, headers: { 'Content-Type': 'application/json' } }); }
function cors(res){
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return res;
}
