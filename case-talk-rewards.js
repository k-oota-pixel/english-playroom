(() => {
  if (!/\/task-quest\/case-talk\.html$/.test(location.pathname)) return;
  const chat = document.getElementById('chat');
  if (!chat) return;

  let rewarded = false;

  function rewardSuccess() {
    let coins;
    try { coins = parent?.EnglishPlayroomCoins || window.EnglishPlayroomCoins; } catch {}
    if (!coins) return;

    const mode = document.querySelector('.mode.active')?.dataset.mode || 'easy';
    const repairs = Math.max(0, Number((document.getElementById('casecount')?.textContent || '').match(/\d+/)?.[0] || 0));
    const caseText = document.getElementById('questnum')?.textContent || '';
    const caseNo = caseText.match(/CASE\s+(\d+)/i)?.[1] || 'current';
    const payload = {kind:'answer', itemId:`case-${caseNo}`, mode, score:repairs};
    const uid = typeof coins.getUserId === 'function' ? coins.getUserId() : '';
    if (uid) payload.expectedUid = uid;

    if (typeof coins.recordTitleEvent === 'function') void coins.recordTitleEvent('case-talk', payload);
    if (typeof coins.awardOncePerDay === 'function') void coins.awardOncePerDay('case-talk', 'daily-success', 'ケーストーク成功！');
  }

  function sync() {
    const success = chat.querySelector('.system.success');
    if (!success) { rewarded = false; return; }
    if (rewarded) return;
    rewarded = true;
    rewardSuccess();
  }

  new MutationObserver(sync).observe(chat, {childList:true, subtree:true});
  sync();
})();
