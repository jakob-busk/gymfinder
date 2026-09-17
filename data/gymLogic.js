// Beregner den "ærlige årspris": det brugeren reelt betaler i gennemsnit pr. måned
// over et år, når man tager højde for studiepris/kampagnepris og oprettelsesgebyr.
// Rækkefølge pr. måned: studiepris (hvis aktiv) > kampagnepris (hvis aktiv) > standardpris.
export function getPriceBreakdown(gym) {
  const monthlyPrices = [];

  for (let month = 1; month <= 12; month++) {
    const studentActive = gym.studentPrice != null && (gym.studentMonths == null || month <= gym.studentMonths);
    const campaignActive = gym.campaignPrice != null && month <= gym.campaignMonths;

    if (studentActive) {
      monthlyPrices.push(gym.studentPrice);
    } else if (campaignActive) {
      monthlyPrices.push(gym.campaignPrice);
    } else {
      monthlyPrices.push(gym.standardPrice);
    }
  }

  const total = monthlyPrices.reduce((sum, price) => sum + price, 0) + gym.signupFee;
  const honestYearlyPrice = Math.round(total / 12);

  return { monthlyPrices, total, honestYearlyPrice };
}

export function getPriceExplanation(gym) {
  const { honestYearlyPrice } = getPriceBreakdown(gym);
  const lines = [];

  if (gym.studentPrice != null && gym.studentMonths == null) {
    lines.push(`Studiepris: ${gym.studentPrice} kr/md hele året.`);
  } else if (gym.studentPrice != null) {
    lines.push(`Studiepris: ${gym.studentPrice} kr/md i ${gym.studentMonths} måneder, derefter ${gym.standardPrice} kr/md.`);
  } else if (gym.campaignPrice != null) {
    lines.push(`Kampagnepris: ${gym.campaignPrice} kr/md i ${gym.campaignMonths} måneder, derefter ${gym.standardPrice} kr/md.`);
  } else {
    lines.push(`${gym.standardPrice} kr/md hele året.`);
  }

  if (gym.signupFee > 0) {
    lines.push(`Inkl. ${gym.signupFee} kr i oprettelsesgebyr, fordelt over året.`);
  }

  lines.push(`Ærlig årspris: ${honestYearlyPrice} kr/md.`);

  return lines.join(' ');
}

export function matchesPreferences(gym, preferences) {
  if (gym.subscriptionType !== preferences.subscriptionType) return false;
  if (preferences.sauna !== null && gym.sauna !== preferences.sauna) return false;
  return preferences.machines.every((machine) => gym.machines.includes(machine));
}

// Hårdt filter på præferencer, derefter sortering af de tilbageværende centre.
// "Anbefalet" er altid det billigste center blandt dem, der matcher alle præferencer —
// uafhængig af hvilken sortering brugeren har valgt.
export function getVisibleGyms(gyms, preferences, sortBy) {
  const matching = gyms
    .filter((gym) => matchesPreferences(gym, preferences))
    .map((gym) => ({ ...gym, honestYearlyPrice: getPriceBreakdown(gym).honestYearlyPrice }));

  const recommendedId =
    matching.length > 0
      ? matching.reduce((best, gym) => (gym.honestYearlyPrice < best.honestYearlyPrice ? gym : best)).id
      : null;

  const sorted = [...matching].sort((a, b) => {
    if (sortBy === 'Distance') return a.distanceKm - b.distanceKm;
    // 'Pris' og 'Præferencer' sorterer begge efter ærlig årspris: alle tilbageværende
    // centre matcher allerede 100% af præferencerne (hårdt filter), så billigst vinder.
    return a.honestYearlyPrice - b.honestYearlyPrice;
  });

  return { visibleGyms: sorted, recommendedId };
}
