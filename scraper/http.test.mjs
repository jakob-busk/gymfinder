// HTTP-klienten: høflighed (User-Agent og pause), cookies og redirects. Ingen rigtige kald.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { USER_AGENT, createHttpClient } from './http.mjs';

const CHECKOUT =
  'https://www.sats.dk/bliv-medlem-sats/tilpas-medlemskab?clubId=412&membershipId=PREMIUM_NOBND';

// Falsk fetch, der svarer med de givne svar i rækkefølge og husker kaldene.
function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, headers: options.headers, redirect: options.redirect });
    return responses.shift();
  };
  return { fetchImpl, calls };
}

describe('HTTP-klient', () => {
  test('sender en ærlig User-Agent', async () => {
    const { fetchImpl, calls } = fakeFetch([new Response('ok')]);
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    assert.equal(await http.getText('https://www.sats.dk/traeningscenter'), 'ok');
    assert.equal(calls[0].headers['User-Agent'], USER_AGENT);
    assert.match(USER_AGENT, /GymFinder/);
  });

  test('følger 303 med session-cookie, som SATS\' checkout kræver', async () => {
    const { fetchImpl, calls } = fakeFetch([
      new Response(null, {
        status: 303,
        headers: {
          location: 'tilpas-medlemskab?clubId=412&membershipId=PREMIUM_NOBND',
          'set-cookie': '.SATSSESSIONID=%7B%22sessionId%22%3A%22abc%22%7D; max-age=3600; path=/',
        },
      }),
      new Response('<html>checkout</html>'),
    ]);
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    assert.equal(await http.getText(CHECKOUT), '<html>checkout</html>');
    assert.equal(calls.length, 2);
    assert.equal(calls[0].redirect, 'manual');
    assert.equal(calls[0].headers.Cookie, undefined);
    assert.equal(calls[1].url, CHECKOUT);
    assert.equal(calls[1].headers.Cookie, '.SATSSESSIONID=%7B%22sessionId%22%3A%22abc%22%7D');
  });

  test('holder pause mellem kald', async () => {
    const waits = [];
    const { fetchImpl } = fakeFetch([new Response('a'), new Response('b'), new Response('c')]);
    const http = createHttpClient({
      fetchImpl,
      delayMs: 2500,
      sleepImpl: async (ms) => waits.push(ms),
    });

    await http.getText('https://www.sats.dk/a');
    await http.getText('https://www.sats.dk/b');
    await http.getText('https://www.sats.dk/c');

    // Ingen pause før første kald; derefter (næsten) hele pausen før hvert kald.
    assert.equal(waits.length, 2);
    for (const ms of waits) assert.ok(ms > 2400 && ms <= 2500, `ventede ${ms} ms`);
  });

  test('fejlsvar giver en fejl med statuskoden', async () => {
    const { fetchImpl } = fakeFetch([new Response('nede', { status: 503 })]);
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    await assert.rejects(http.getText('https://www.sats.dk/a'), /HTTP 503/);
  });

  test('en uendelig redirect-løkke stoppes', async () => {
    const loop = () =>
      new Response(null, { status: 302, headers: { location: 'https://www.sats.dk/a' } });
    const { fetchImpl } = fakeFetch(Array.from({ length: 10 }, loop));
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    await assert.rejects(http.getText('https://www.sats.dk/a'), /For mange redirects/);
  });

  test('postForm sender en formular med User-Agent og holder samme pause', async () => {
    const calls = [];
    const waits = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, ...options });
      return new Response('{"success":true}');
    };
    const http = createHttpClient({
      fetchImpl,
      delayMs: 2500,
      sleepImpl: async (ms) => waits.push(ms),
    });

    await http.getText('https://loopfitness.dk/centre/');
    const text = await http.postForm('https://loopfitness.dk/wp-admin/admin-ajax.php', {
      action: 'loop_get_subscription',
      subscription: 'kampagne: 100 kr. resten af året',
    });

    assert.equal(text, '{"success":true}');
    assert.equal(calls[1].method, 'POST');
    assert.equal(calls[1].headers['User-Agent'], USER_AGENT);
    assert.match(calls[1].headers['Content-Type'], /application\/x-www-form-urlencoded/);
    assert.equal(
      calls[1].body,
      'action=loop_get_subscription&subscription=kampagne%3A+100+kr.+resten+af+%C3%A5ret',
    );
    assert.equal(waits.length, 1);
  });

  test('postForm giver en fejl ved fejlsvar', async () => {
    const fetchImpl = async () => new Response('nede', { status: 500 });
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    await assert.rejects(http.postForm('https://loopfitness.dk/a', { a: '1' }), /HTTP 500/);
  });
});
