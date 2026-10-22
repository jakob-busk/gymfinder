// Falske push-afsendere til tests. Ingen af dem rører netværket, så testene sender aldrig
// rigtige push.

// Falsk push-afsender med samme snitflade som createExpoPushClient: { send, getReceipts }.
// ticketFor(message) bestemmer svaret pr. besked (standard: Expo tog imod den).
// receipts: { [ticketId]: kvittering } som Expo ville svare ved næste kørsel.
export function createFakePushClient({ ticketFor = () => ({ status: 'ok' }), receipts = {} } = {}) {
  const sendCalls = [];
  const receiptCalls = [];
  let nextId = 1;

  return {
    async send(messages) {
      sendCalls.push(structuredClone(messages));
      return messages.map((message) => {
        const ticket = ticketFor(message);
        return ticket.status === 'ok' ? { id: `ticket-${nextId++}`, ...ticket } : ticket;
      });
    },
    async getReceipts(ids) {
      receiptCalls.push([...ids]);
      return Object.fromEntries(ids.filter((id) => receipts[id]).map((id) => [id, receipts[id]]));
    },
    // Hjælpere til testene.
    sendCalls,
    receiptCalls,
    get messages() {
      return sendCalls.flat();
    },
  };
}

// Falsk fetch til createExpoPushClient. respond(url, body) returnerer { status, json } eller
// kaster (netværksfejl). Standard: Expo tager imod alle beskeder.
export function createFakeFetch(respond) {
  const requests = [];
  let nextId = 1;
  const defaultRespond = (url, body) => ({
    status: 200,
    json: Array.isArray(body)
      ? { data: body.map(() => ({ status: 'ok', id: `ticket-${nextId++}` })) }
      : { data: {} },
  });

  async function fetch(url, init) {
    const body = JSON.parse(init.body);
    requests.push({ url, method: init.method, headers: init.headers, body });
    const { status, json } = await (respond ?? defaultRespond)(url, body);
    return { ok: status >= 200 && status < 300, status, json: async () => json };
  }

  fetch.requests = requests;
  return fetch;
}
