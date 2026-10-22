// HTTP-klient til scraperen. Høflig over for kædernes hjemmesider: ærlig User-Agent, ét kald
// ad gangen og en pause mellem kaldene. Holder styr på cookies og følger redirects selv, fordi
// fx SATS' tilpas-medlemskab først sætter en session-cookie i et 303-svar.

export const USER_AGENT =
  'GymFinder-scraper/1.0 (prissammenligning; https://github.com/jakob-busk/gymfinder)';

const MAX_REDIRECTS = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createHttpClient({
  fetchImpl = fetch,
  delayMs = 2500,
  userAgent = USER_AGENT,
  sleepImpl = sleep,
} = {}) {
  // Én cookie-krukke pr. host: navn → værdi.
  const cookieJar = new Map();
  let lastRequestAt = null;

  const cookieHeaderFor = (url) => {
    const cookies = cookieJar.get(url.host);
    if (!cookies || cookies.size === 0) return null;
    return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  };

  const storeCookies = (url, response) => {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    if (setCookies.length === 0) return;
    const cookies = cookieJar.get(url.host) ?? new Map();
    for (const line of setCookies) {
      const [pair] = line.split(';');
      const separator = pair.indexOf('=');
      if (separator > 0) cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
    }
    cookieJar.set(url.host, cookies);
  };

  const waitForTurn = async () => {
    if (lastRequestAt != null) {
      const remaining = delayMs - (Date.now() - lastRequestAt);
      if (remaining > 0) await sleepImpl(remaining);
    }
    lastRequestAt = Date.now();
  };

  // Henter en side som tekst. Kaster ved netværksfejl og ved andet end 2xx efter redirects.
  async function getText(address) {
    let url = new URL(address);

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      await waitForTurn();
      const headers = { 'User-Agent': userAgent, Accept: 'text/html,application/json' };
      const cookie = cookieHeaderFor(url);
      if (cookie) headers.Cookie = cookie;

      const response = await fetchImpl(url.href, { headers, redirect: 'manual' });
      storeCookies(url, response);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) throw new Error(`HTTP ${response.status} uden Location: ${url.href}`);
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url.href}`);
      return response.text();
    }

    throw new Error(`For mange redirects: ${address}`);
  }

  // Sender en formular (application/x-www-form-urlencoded) og returnerer svaret som tekst, fx
  // LOOPs admin-ajax, som kun læser POST. Samme høflighed og cookies som getText.
  async function postForm(address, fields) {
    const url = new URL(address);
    await waitForTurn();
    const headers = {
      'User-Agent': userAgent,
      Accept: 'application/json,text/html',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    };
    const cookie = cookieHeaderFor(url);
    if (cookie) headers.Cookie = cookie;

    const body = new URLSearchParams(fields).toString();
    const response = await fetchImpl(url.href, { method: 'POST', headers, body, redirect: 'manual' });
    storeCookies(url, response);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url.href}`);
    return response.text();
  }

  return { getText, postForm };
}
