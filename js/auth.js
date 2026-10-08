/* =====================================================
   NotaLista — login real (Supabase Auth) com fallback local
   Se NL_CONFIG.supabaseUrl estiver vazio → modo local
   (perfil salvo no navegador). Com Supabase: contas reais,
   sessão persistente, dados por usuário (RLS).
   ===================================================== */
(function(){
'use strict';

var cfg = window.NL_CONFIG || {};
var sb = null;
if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
  sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
}

var listeners = [];
function emit(user){
  listeners.forEach(function(fn){ try{fn(user)}catch(e){} });
}

window.NL = window.NL || {};

/* ---------- API de autenticação ---------- */
NL.auth = {
  isCloud: function(){ return !!sb; },

  getUser: function(){ return this._user || null; },
  _user: null,

  onChange: function(fn){ listeners.push(fn); },

  init: function(){
    var self = this;
    if (!sb) {
      // modo local: perfil do localStorage
      try { self._user = JSON.parse(localStorage.getItem('nl-user') || 'null'); } catch(e){}
      emit(self._user);
      return Promise.resolve(self._user);
    }
    return sb.auth.getSession().then(function(res){
      self._user = res.data && res.data.session ? res.data.session.user : null;
      emit(self._user);
      sb.auth.onAuthStateChange(function(ev, session){
        self._user = session ? session.user : null;
        emit(self._user);
      });
      return self._user;
    });
  },

  signUp: function(email, password, name){
    if (!sb) return Promise.reject(new Error('Sem nuvem configurada — use entrar no modo local.'));
    return sb.auth.signUp({
      email: email, password: password,
      options: { data: { name: name } }
    }).then(function(res){
      if (res.error) throw res.error;
      return res;
    });
  },

  signIn: function(email, password){
    if (!sb) return Promise.reject(new Error('Sem nuvem configurada — use entrar no modo local.'));
    return sb.auth.signInWithPassword({ email: email, password: password })
      .then(function(res){ if (res.error) throw res.error; return res; });
  },

  resetPassword: function(email){
    if (!sb) return Promise.reject(new Error('Sem nuvem configurada.'));
    return sb.auth.resetPasswordForEmail(email).then(function(res){
      if (res.error) throw res.error; return res;
    });
  },

  signOut: function(){
    this._user = null;
    if (!sb) { localStorage.removeItem('nl-user'); emit(null); return Promise.resolve(); }
    return sb.auth.signOut();
  },

  /* perfil exibido (nome) */
  displayName: function(){
    var u = this._user;
    if (!u) return null;
    if (sb && u.user_metadata && u.user_metadata.name) return u.user_metadata.name;
    if (!sb && u.name) return u.name;
    return (u.email || 'usuário').split('@')[0];
  },

  /* salvar perfil local (modo local) */
  saveLocal: function(name){
    var u = { name: name, email: null, local: true };
    localStorage.setItem('nl-user', JSON.stringify(u));
    this._user = u; emit(u); return u;
  }
};
})();
