/* Toolyfi Sitewide Rulebook: insert one clear global brand header without touching tool logic. */
(function () {
  function createHeader() {
    if (document.getElementById('tf-global-header')) return;

    var header = document.createElement('div');
    header.id = 'tf-global-header';
    header.setAttribute('role', 'banner');
    header.innerHTML =
      '<div class="tf-header-shell">' +
        '<a class="tf-global-brand" href="/" aria-label="Toolyfi home">' +
          '<span class="tf-emblem-frame" aria-hidden="true">' +
            '<img src="/images/toolyfi-header-emblem.png" alt="" width="38" height="38">' +
            '<span class="tf-emblem-fallback"></span>' +
          '</span>' +
          '<span>Tool<span class="tf-word-accent">yfi</span></span>' +
        '</a>' +
        '<nav class="tf-global-links" aria-label="Toolyfi navigation">' +
          '<a href="/">Home</a>' +
          '<a href="/#directory">Categories</a>' +
          '<a href="/word-counter.html">Text tools</a>' +
        '</nav>' +
        '<a class="tf-all-tools" href="/#directory">All tools</a>' +
      '</div>';

    var image = header.querySelector('img');
    image.addEventListener('error', function () {
      image.style.display = 'none';
      header.querySelector('.tf-emblem-fallback').style.display = 'block';
    }, { once: true });

    document.body.insertBefore(header, document.body.firstChild);

    var oldNavs = document.querySelectorAll('body > header, body > nav');
    oldNavs.forEach(function (oldNav) {
      if (!oldNav.closest('#tf-global-header')) oldNav.classList.add('tf-legacy-nav');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createHeader, { once: true });
  } else {
    createHeader();
  }
})();
