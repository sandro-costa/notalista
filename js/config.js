/* =====================================================
   NotaLista — integrações externas
   Supabase (login real + nuvem) e proxy Sefaz (itens).
   A anon key é pública por design (protegida por RLS no
   Supabase) — pode ficar no front-end.
   ===================================================== */
window.NL_CONFIG = {
  // Painel Supabase → Project Settings → API
  supabaseUrl: 'https://urbpflsduurirtorarvuy.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyYnBmbHNkdXVyaXJ0b2FydnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzAyODgsImV4cCI6MjEwNzA0NjI4OH0.JBgVK5tmp6l9OfaHJB0fp0ZI_jtC4gUoaP_6m8q3TdU',

  // Proxy para extrair ITENS da NFC-e (fase 2, exige gov.br).
  // functions/sefaz-proxy.js — Cloudflare Worker / Vercel Edge.
  sefazProxy: ''          // ex.: 'https://sefaz-proxy.suaconta.workers.dev'
};
