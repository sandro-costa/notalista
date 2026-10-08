/* =====================================================
   NotaLista — integrações externas
   Supabase (login real + nuvem) e proxy Sefaz (itens).
   Preencha abaixo após criar o projeto gratuito no
   supabase.com — sem isso o app roda em modo local.
   ===================================================== */
window.NL_CONFIG = {
  // Painel Supabase → Project Settings → API
  supabaseUrl: '',        // ex.: 'https://xxxxx.supabase.co'
  supabaseAnonKey: '',    // chave pública (anon)

  // Proxy para extrair ITENS da NFC-e (fase 2, exige gov.br).
  // functions/sefaz-proxy.js — Cloudflare Worker / Vercel Edge.
  sefazProxy: ''          // ex.: 'https://sefaz-proxy.suaconta.workers.dev'
};
