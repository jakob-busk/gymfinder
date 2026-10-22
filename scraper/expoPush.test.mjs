// Afsenderen til Expo Push Service med en falsk fetch: ingen rigtige push.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EXPO_PUSH_RECEIPTS_URL,
  EXPO_PUSH_SEND_URL,
  createExpoPushClient,
  isExpoPushToken,
} from './expoPush.mjs';
import { createFakeFetch } from './testing/fakePush.mjs';

const message = (i) => ({ to: `ExponentPushToken[token-${i}]`, title: 'Prisfald', body: `${i}` });
const messages = (count) => Array.from({ length: count }, (_, i) => message(i));

describe('send', () => {
  test('højst 100 beskeder pr. kald og ét ticket pr. besked i rækkefølge', async () => {
    const fetch = createFakeFetch();
    const tickets = await createExpoPushClient({ fetch }).send(messages(250));

    assert.deepEqual(
      fetch.requests.map((request) => [request.url, request.method, request.body.length]),
      [
        [EXPO_PUSH_SEND_URL, 'POST', 100],
        [EXPO_PUSH_SEND_URL, 'POST', 100],
        [EXPO_PUSH_SEND_URL, 'POST', 50],
      ],
    );
    assert.equal(fetch.requests[2].body[49].to, 'ExponentPushToken[token-249]');
    assert.equal(tickets.length, 250);
    assert.deepEqual(tickets[0], { status: 'ok', id: 'ticket-1' });
    assert.deepEqual(tickets[249], { status: 'ok', id: 'ticket-250' });
  });

  test('ingen beskeder: intet kald', async () => {
    const fetch = createFakeFetch();
    assert.deepEqual(await createExpoPushClient({ fetch }).send([]), []);
    assert.equal(fetch.requests.length, 0);
  });

  test('fejl pr. besked (DeviceNotRegistered) gives videre som ticket', async () => {
    const fetch = createFakeFetch(() => ({
      status: 200,
      json: {
        data: [
          { status: 'ok', id: 'a' },
          {
            status: 'error',
            message: '"ExponentPushToken[token-1]" is not a registered push notification recipient',
            details: { error: 'DeviceNotRegistered' },
          },
        ],
      },
    }));
    const tickets = await createExpoPushClient({ fetch }).send(messages(2));

    assert.equal(tickets[0].status, 'ok');
    assert.deepEqual(tickets[1].details, { error: 'DeviceNotRegistered' });
  });

  test('et fejlet kald giver fejl-tickets for sit bundt, men de andre bundter sendes', async () => {
    let call = 0;
    const fetch = createFakeFetch((url, body) => {
      call += 1;
      if (call === 1) return { status: 503, json: {} };
      return { status: 200, json: { data: body.map(() => ({ status: 'ok', id: 'x' })) } };
    });
    const tickets = await createExpoPushClient({ fetch }).send(messages(101));

    assert.equal(fetch.requests.length, 2);
    assert.deepEqual(tickets[0], { status: 'error', message: 'HTTP 503' });
    assert.deepEqual(tickets[99], { status: 'error', message: 'HTTP 503' });
    assert.deepEqual(tickets[100], { status: 'ok', id: 'x' });
  });

  test('netværksfejl og fejl for hele kaldet giver fejl-tickets', async () => {
    const offline = createFakeFetch(() => {
      throw new Error('fetch failed');
    });
    assert.deepEqual(await createExpoPushClient({ fetch: offline }).send(messages(1)), [
      { status: 'error', message: 'fetch failed' },
    ]);

    const rejected = createFakeFetch(() => ({
      status: 200,
      json: { errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS', message: 'For mange projekter' }] },
    }));
    assert.deepEqual(await createExpoPushClient({ fetch: rejected }).send(messages(1)), [
      { status: 'error', message: 'For mange projekter' },
    ]);
  });

  test('access token sendes kun, når det er sat', async () => {
    const withToken = createFakeFetch();
    await createExpoPushClient({ fetch: withToken, accessToken: 'hemmelig' }).send(messages(1));
    assert.equal(withToken.requests[0].headers.Authorization, 'Bearer hemmelig');

    const withoutToken = createFakeFetch();
    await createExpoPushClient({ fetch: withoutToken }).send(messages(1));
    assert.equal(withoutToken.requests[0].headers.Authorization, undefined);
    assert.equal(withoutToken.requests[0].headers['Content-Type'], 'application/json');
  });
});

describe('getReceipts', () => {
  test('henter kvitteringer i bundter på højst 1000 id’er', async () => {
    const fetch = createFakeFetch((url, body) => ({
      status: 200,
      json: { data: Object.fromEntries(body.ids.map((id) => [id, { status: 'ok' }])) },
    }));
    const ids = Array.from({ length: 1500 }, (_, i) => `id-${i}`);
    const receipts = await createExpoPushClient({ fetch }).getReceipts(ids);

    assert.deepEqual(
      fetch.requests.map((request) => [request.url, request.body.ids.length]),
      [
        [EXPO_PUSH_RECEIPTS_URL, 1000],
        [EXPO_PUSH_RECEIPTS_URL, 500],
      ],
    );
    assert.equal(Object.keys(receipts).length, 1500);
  });

  test('en HTTP-fejl kaster, så kvitteringerne kan prøves igen senere', async () => {
    const fetch = createFakeFetch(() => ({ status: 500, json: {} }));
    await assert.rejects(createExpoPushClient({ fetch }).getReceipts(['a']), /HTTP 500/);
  });
});

test('isExpoPushToken genkender Expo push-tokens', () => {
  assert.equal(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);
  assert.equal(isExpoPushToken('ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]'), true);
  assert.equal(isExpoPushToken('ExponentPushToken[]'), false);
  assert.equal(isExpoPushToken('fcm-device-token'), false);
  assert.equal(isExpoPushToken(null), false);
});
