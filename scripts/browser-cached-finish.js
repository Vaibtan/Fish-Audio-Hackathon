async (page) => {
  // First run browser-offline.js, then stop only the isolated server on 3811.
  // Keep this same tab alive; never reload it after the server is stopped.
  const base = 'http://127.0.0.1:3811';
  if (page.url() !== base + '/') throw new Error('Cached page lost.');
  const button = name => page.getByRole('button', { name, exact: true });
  const requests = [];
  const onRequest = request => requests.push(request.url());
  page.on('request', onRequest);
  try {
    let unreachable = false;
    try { await page.request.get(base + '/api/health', { timeout: 1500 }); }
    catch { unreachable = true; }
    if (!unreachable) throw new Error('Test server still available.');
    if (!await button('Play the scene').isEnabled()) throw new Error('Committed round not ready.');
    await button('Play the scene').click();
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Request a rehearsal' && !b.disabled), null, { timeout: 15000 });
    await button('Request a rehearsal').click();
    await page.getByText('Player 1 wins.', { exact: true }).waitFor();
    const network = requests.filter(url => /^https?:/.test(url));
    if (network.length) throw new Error('Cached completion unexpectedly required HTTP.');
    return { kind: 'actual-built-cached-round-server-stopped', createdAt: new Date().toISOString(), serverHealthUnreachable: true, actualInitialPlaybackCompleted: true, scoringAndReveal: true, httpRequestsDuringCompletion: network, resourceRequests: requests, reveal: await page.locator('main').innerText() };
  } finally { page.off('request', onRequest); }
}
