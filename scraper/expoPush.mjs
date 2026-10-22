// Afsender til Expo Push Service (gratis, ingen afhængigheder: Nodes egen fetch).
//
//   send(messages)      → ét ticket pr. besked i samme rækkefølge:
//                         { status: 'ok', id } eller { status: 'error', message, details? }
//   getReceipts(ids)    → { [ticketId]: { status: 'ok' } | { status: 'error', details? } }
//
// Beskederne sendes i bundter (højst 100 pr. kald, Expos grænse), og kvitteringer hentes i
// bundter på højst 1000 id'er. Fejler et helt kald (netværk, HTTP-fejl), får hver besked i
// bundtet et fejl-ticket i stedet for at hele kørslen stopper, så resten stadig sendes.
//
// fetch sendes ind udefra, så testene kan bruge en falsk; testene sender aldrig rigtige push.
// accessToken er kun nødvendig, hvis "push security" er slået til i Expo-projektet.
// https://docs.expo.dev/push-notifications/sending-notifications/

export const EXPO_PUSH_SEND_URL = 'https://exp.host/--/api/v2/push/send';
export const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
export const MAX_MESSAGES_PER_REQUEST = 100;
export const MAX_RECEIPT_IDS_PER_REQUEST = 1000;

// Formen på et Expo push-token: ExponentPushToken[...] (eller den nyere ExpoPushToken[...]).
export const isExpoPushToken = (token) =>
  typeof token === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export function createExpoPushClient({ fetch = globalThis.fetch, accessToken } = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  async function post(url, body) {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    // Fejl for hele kaldet (fx for mange projekter i ét bundt) står i errors.
    if (json?.errors?.length) throw new Error(json.errors.map((error) => error.message).join('; '));
    return json?.data;
  }

  async function sendChunk(messages) {
    try {
      const tickets = await post(EXPO_PUSH_SEND_URL, messages);
      if (!Array.isArray(tickets) || tickets.length !== messages.length) {
        throw new Error('Uventet svar fra Expo Push Service');
      }
      return tickets;
    } catch (error) {
      return messages.map(() => ({ status: 'error', message: error.message }));
    }
  }

  return {
    async send(messages) {
      const tickets = [];
      for (const messageChunk of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
        tickets.push(...(await sendChunk(messageChunk)));
      }
      return tickets;
    },

    // Id'er, Expo ikke har en kvittering for (endnu eller længere), er ikke med i svaret.
    async getReceipts(ids) {
      const receipts = {};
      for (const idChunk of chunk(ids, MAX_RECEIPT_IDS_PER_REQUEST)) {
        Object.assign(receipts, await post(EXPO_PUSH_RECEIPTS_URL, { ids: idChunk }));
      }
      return receipts;
    },
  };
}
