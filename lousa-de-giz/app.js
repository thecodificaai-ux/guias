(function () {
  'use strict';
  document.documentElement.classList.add('js');

  // Copiar o prompt
  var status = document.querySelector('.status');

  function copiarFallback(texto) {
    var area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  function avisar(botao, ok) {
    var rotulo = botao.getAttribute('data-rotulo');
    botao.textContent = ok ? 'Copiado!' : 'Selecione e copie';
    if (ok) botao.classList.add('copiado');
    if (status) status.textContent = ok ? 'Prompt copiado. Agora cole no seu assistente.' : 'Não deu para copiar sozinho. Selecione o texto e copie.';
    setTimeout(function () {
      botao.textContent = rotulo;
      botao.classList.remove('copiado');
    }, 2200);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-copiar]'), function (botao) {
    botao.addEventListener('click', function () {
      var alvo = document.getElementById(botao.getAttribute('data-copiar'));
      var texto = alvo ? alvo.textContent.trim() : '';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(
          function () { avisar(botao, true); },
          function () { avisar(botao, copiarFallback(texto)); }
        );
      } else {
        avisar(botao, copiarFallback(texto));
      }
    });
  });

  // Abas
  var lista = document.querySelector('[role="tablist"]');
  if (!lista) return;
  var abas = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
  lista.hidden = false;

  function escolher(aba, focar) {
    abas.forEach(function (a) {
      var ativa = a === aba;
      a.setAttribute('aria-selected', ativa ? 'true' : 'false');
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !ativa;
    });
    if (focar) aba.focus();
  }

  abas.forEach(function (aba, i) {
    aba.addEventListener('click', function () { escolher(aba, false); });
    aba.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % abas.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + abas.length) % abas.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = abas.length - 1;
      if (n !== null) { e.preventDefault(); escolher(abas[n], true); }
    });
  });

  escolher(abas[0], false);
})();
