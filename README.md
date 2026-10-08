# NotaLista

A lista de compras que nasce da nota fiscal. Demo funcional (PWA) de um app que lê a NFC-e e monta a lista do mercado automaticamente.

- `index.html` — landing page completa
- `app.html` — app funcional (login real via Supabase, scan real de QR code da NFC-e, histórico e preços)
- `auth.html` — login/criar conta/recuperar senha (Supabase Auth ou modo local)
- `functions/sefaz-proxy.js` — proxy serverless para extrair os ITENS da nota (fase 2, autentica gov.br)
- PWA instalável: manifest + service worker + ícone SVG

## Ativar o login real (Supabase, grátis)

1. Crie um projeto em [supabase.com](https://supabase.com) (plano free).
2. Copie **Project URL** e **anon key** (Settings → API).
3. Cole em `js/config.js`.
4. No painel Supabase: Authentication → URL Configuration → adicione `https://sandro-costa.github.io/notalista/` e `http://localhost:8046`.
5. Pronto: criar conta, e-mail de confirmação, recuperar senha e sessão persistente funcionando.

## Ativar os ITENS da nota (fase 2)

A página de consulta da Sefaz exige login gov.br (CPF+senha), então os itens não podem ser lidos direto do navegador:
1. Faça deploy de `functions/sefaz-proxy.js` (Cloudflare Workers grátis).
2. Configure os segredos `GOVBR_CPF` / `GOVBR_SENHA` (conta de serviço com 2FA por app).
3. Preencha a URL do worker em `js/config.js` (`sefazProxy`).

Enquanto isso, o scan real já traz do QR: chave de acesso validada (DV mod-11), CNPJ do emitente, UF, data/hora de emissão e valor total — e valida QR falsificado.

## Publicar no GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: **main** → Save.

## Demo

Login: modo local (sem nuvem) ou contas reais (Supabase). O scan usa câmera real (jsQR) + link do QR; os itens completos dependem do proxy gov.br.
