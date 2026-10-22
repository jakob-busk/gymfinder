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

describe('HTTP-klient: formularer med ekstra headers (PureGym)', () => {
  const FORM_PAGE = 'https://www.puregym.dk/bliv-medlem/118/medlemskab';
  const AJAX = `${FORM_PAGE}?ajax_form=1&_wrapper_format=drupal_ajax`;

  // Falsk fetch, der også husker metode og indhold.
  function recordingFetch(responses) {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, ...options });
      return responses.shift();
    };
    return { fetchImpl, calls };
  }

  test('sender felterne urlencoded med User-Agent, ekstra headers og sidens cookies', async () => {
    const { fetchImpl, calls } = recordingFetch([
      new Response('<form>', { headers: { 'set-cookie': 'SSESS1=abc; path=/; HttpOnly' } }),
      new Response('[{"command":"settings"}]'),
    ]);
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    await http.getText(FORM_PAGE);
    const body = await http.postForm(
      AJAX,
      {
        form_id: 'buy_membership_v2_2_step_choose_membership_vp',
        _triggering_element_value: 'Under 30 år',
      },
      { 'X-Requested-With': 'XMLHttpRequest' },
    );

    assert.equal(body, '[{"command":"settings"}]');
    const post = calls[1];
    assert.equal(post.method, 'POST');
    assert.equal(post.url, AJAX);
    assert.equal(
      post.body,
      'form_id=buy_membership_v2_2_step_choose_membership_vp' +
        '&_triggering_element_value=Under+30+%C3%A5r',
    );
    assert.equal(post.headers['User-Agent'], USER_AGENT);
    assert.equal(post.headers['X-Requested-With'], 'XMLHttpRequest');
    assert.match(post.headers['Content-Type'], /^application\/x-www-form-urlencoded/);
    assert.equal(post.headers.Cookie, 'SSESS1=abc');
  });

  test('en redirect efter POST følges ikke, men giver en fejl', async () => {
    const { fetchImpl } = recordingFetch([
      new Response(null, { status: 302, headers: { location: '/' } }),
    ]);
    const http = createHttpClient({ fetchImpl, delayMs: 0 });

    await assert.rejects(http.postForm(AJAX, {}), /HTTP 302/);
  });
});
