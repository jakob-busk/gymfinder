// Prisalarmer som push fra nat-jobbet. Hvornår en Prisalarm er opfyldt, og hvad beskeden siger,
// kommer fra appens egen data/priceAlerts.js (med Matchning), så Besparelsen regnes præcis som i
// appen. Her ligger kun det, der hører til serveren: hvilke Centre der må give alarmer, afsendelse
// via Expo Push Service, og hvad der skal skrives bagefter.
//
// Regler:
// - Kun Centre fra Kæder, der faktisk blev opdateret i nat, kan udløse en alarm. En Kæde, der er
//   sprunget over (eller kun har håndindtastede data), giver ingen alarmer.
// - Efter en push, Expo har taget imod, gemmes den nye pris (honestYearlyPrice på Favoritten eller
//   notifiedHonestYearlyPrice på alarmen for Nuværende medlemskab), så samme fald ikke sendes igen.
//   Fejler afsendelsen, gemmes intet, og alarmen prøves igen næste nat.
// - DeviceNotRegistered (appen er slettet, eller tilladelsen er trukket tilbage) sletter
//   Users/<uid>/pushToken. Expo kan svare det med det samme (ticket) eller først senere
//   (kvittering). Derfor gemmes hvert ticket-id under PushTickets, og kvitteringerne hentes ved
//   næste kørsel.
// - Brugere uden push-token springes over; appens sikkerhedsnet viser alarmen, når den åbnes.
//
// Rapporten indeholder hverken uid'er eller tokens, da den står i GitHub Actions' job-oversigt.

import { fromStoredFavorites } from '../data/favorites.js';
import {
  currentMembershipAlertTrigger,
  favoriteAlertTriggers,
  fromStoredCurrentMembershipAlert,
  hasAnyPriceAlert,
  priceAlertMessage,
} from '../data/priceAlerts.js';
import { fromStoredProfile } from '../data/userProfile.js';
import { isExpoPushToken } from './expoPush.mjs';

export const USERS_PATH = 'Users';
export const PUSH_TICKETS_PATH = 'PushTickets';

// Expo gemmer kvitteringer i ca. et døgn. Et ticket, hvis kvittering ikke kunne hentes, prøves
// igen, men glemmes efter 2 dage.
const FORGET_TICKET_AFTER_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const pushTokenPath = (uid) => `${USERS_PATH}/${uid}/pushToken`;
const storedToken = (storedUser) => storedUser?.pushToken?.expoPushToken ?? null;
const isDeviceNotRegistered = (result) =>
  result?.status === 'error' && result.details?.error === 'DeviceNotRegistered';

// Opfyldte Prisalarmer for alle brugere: [{ uid, token, trigger }].
// users er Users-noden fra databasen; chains og centers er i Matchnings form (fromDatabase).
export function findPriceAlerts({ users, chains, centers, updatedChainIds, today }) {
  const updated = new Set(updatedChainIds);
  const updatedCenters = (centers ?? []).filter((center) => updated.has(center.chainId));
  const alerts = [];

  for (const [uid, stored] of Object.entries(users ?? {})) {
    const favorites = fromStoredFavorites(stored?.favorites);
    const currentMembershipAlert = fromStoredCurrentMembershipAlert(stored?.currentMembershipAlert);
    if (!hasAnyPriceAlert({ favorites, currentMembershipAlert })) continue;

    const user = fromStoredProfile(stored?.profile);
    const context = { centers: updatedCenters, chains, user, today };
    const membershipTrigger = currentMembershipAlertTrigger({
      ...context,
      alert: currentMembershipAlert,
    });
    const triggers = [
      ...(membershipTrigger ? [membershipTrigger] : []),
      ...favoriteAlertTriggers({ ...context, favorites }),
    ];
    for (const trigger of triggers) alerts.push({ uid, token: storedToken(stored), trigger });
  }

  return alerts;
}

// Hvor den nye pris gemmes, når brugeren har fået besked (som markFavoriteNotified og
// markCurrentMembershipAlertNotified i appen). Kun det ene felt skrives, så resten af Favoritten
// eller alarmen, som brugeren kan have ændret i mellemtiden, ikke overskrives.
function notifiedPath(uid, trigger) {
  return trigger.kind === 'currentMembership'
    ? `${USERS_PATH}/${uid}/currentMembershipAlert/notifiedHonestYearlyPrice`
    : `${USERS_PATH}/${uid}/favorites/${trigger.centerId}/honestYearlyPrice`;
}

const isOlderThan = (sentAt, today, days) =>
  !(Date.parse(today) - Date.parse(sentAt) < days * DAY_MS);

// Kvitteringer for push sendt ved tidligere kørsler. Returnerer de uid'er, hvis token er slettet.
async function checkReceipts({ pushClient, pendingTickets, users, today, update, report }) {
  const ids = Object.keys(pendingTickets ?? {});
  const removedTokens = new Set();
  if (ids.length === 0) return removedTokens;

  let receipts;
  try {
    receipts = await pushClient.getReceipts(ids);
  } catch (error) {
    report.errors.push(`Kvitteringer kunne ikke hentes: ${error.message}`);
    for (const id of ids) {
      const sentAt = pendingTickets[id]?.sentAt;
      if (!sentAt || isOlderThan(sentAt, today, FORGET_TICKET_AFTER_DAYS)) {
        update[`${PUSH_TICKETS_PATH}/${id}`] = null;
      }
    }
    return removedTokens;
  }

  for (const id of ids) {
    const { uid, token } = pendingTickets[id] ?? {};
    update[`${PUSH_TICKETS_PATH}/${id}`] = null;
    // Kun hvis telefonen ikke har registreret et nyt token siden.
    if (isDeviceNotRegistered(receipts?.[id]) && uid && storedToken(users?.[uid]) === token) {
      update[pushTokenPath(uid)] = null;
      removedTokens.add(uid);
    }
  }
  report.tokensRemoved += removedTokens.size;
  return removedTokens;
}

function pushMessage(token, trigger) {
  return { to: token, sound: 'default', channelId: 'default', ...priceAlertMessage(trigger) };
}

// Finder opfyldte Prisalarmer, sender dem og returnerer { update, report }. update er de stier,
// der skal skrives sammen med nattens øvrige data (nye priser, slettede tokens, ticket-id'er).
// pushClient = null (tør kørsel): intet sendes, ingen kvitteringer hentes, og update er tom.
// Rapporten viser så, hvad der ville være sendt.
export async function runPriceAlerts({
  users,
  chains,
  centers,
  updatedChainIds,
  today,
  pushClient = null,
  pendingTickets = {},
}) {
  const update = {};
  const report = { sent: [], failed: [], notSent: [], tokensRemoved: 0, errors: [] };

  const removedTokens = pushClient
    ? await checkReceipts({ pushClient, pendingTickets, users, today, update, report })
    : new Set();

  const alerts = findPriceAlerts({ users, chains, centers, updatedChainIds, today });
  const describe = ({ trigger }) => ({
    kind: trigger.kind,
    centerId: trigger.centerId,
    honestYearlyPrice: trigger.honestYearlyPrice,
    savingPerMonth: trigger.savingPerMonth,
  });

  const sendable = [];
  for (const alert of alerts) {
    if (!pushClient) report.notSent.push({ ...describe(alert), reason: 'tør kørsel' });
    else if (!alert.token || removedTokens.has(alert.uid)) {
      report.notSent.push({ ...describe(alert), reason: 'intet push-token' });
    } else if (!isExpoPushToken(alert.token)) {
      report.notSent.push({ ...describe(alert), reason: 'ugyldigt push-token' });
    } else sendable.push(alert);
  }
  if (sendable.length === 0) return { update, report };

  let tickets;
  try {
    const messages = sendable.map(({ token, trigger }) => pushMessage(token, trigger));
    tickets = await pushClient.send(messages);
  } catch (error) {
    tickets = sendable.map(() => ({ status: 'error', message: error.message }));
  }

  sendable.forEach((alert, i) => {
    const ticket = tickets?.[i] ?? { status: 'error', message: 'Intet svar' };
    if (ticket.status === 'ok') {
      update[notifiedPath(alert.uid, alert.trigger)] = alert.trigger.honestYearlyPrice;
      if (ticket.id) {
        update[`${PUSH_TICKETS_PATH}/${ticket.id}`] = {
          uid: alert.uid,
          token: alert.token,
          sentAt: today,
        };
      }
      report.sent.push(describe(alert));
      return;
    }
    const error = ticket.details?.error ?? ticket.message ?? 'ukendt fejl';
    report.failed.push({ ...describe(alert), error });
    if (isDeviceNotRegistered(ticket) && !removedTokens.has(alert.uid)) {
      update[pushTokenPath(alert.uid)] = null;
      removedTokens.add(alert.uid);
      report.tokensRemoved += 1;
    }
  });

  return { update, report };
}
