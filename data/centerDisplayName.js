// Centrets navn, som det vises ved siden af Kædens logo: uden Kædens navn foran, så "Fitness X
// Lyngby" bliver "Lyngby". Kun visningen ændres; data beholder det fulde navn.

// Kæder, hvis Centre ikke starter med Kædens fulde navn. LOOP Fitness' Centre hedder "LOOP Viborg".
const EXTRA_PREFIXES = {
  loop: ['LOOP'],
};

// Skilletegn, der kan stå mellem Kædens navn og resten (mellemrum, bindestreger, ·, komma).
const SEPARATORS = /^[\s\-–—·,]+/;

// Fjerner Kædens navn (eller et kendt alias) foran name, uden at skelne mellem store og små
// bogstaver, og de skilletegn, der følger. Navnet skal stå som et helt ord, så "Satsning" ikke
// bliver til "ning". Bliver der intet tilbage, eller er der ingen Kæde, gives det fulde navn.
export function centerDisplayName(name, chain) {
  if (!name || !chain) return name;
  const prefixes = [chain.name, ...(EXTRA_PREFIXES[chain.id] ?? [])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const prefix of prefixes) {
    const head = name.slice(0, prefix.length);
    const rest = name.slice(prefix.length);
    if (head.toLocaleLowerCase('da') !== prefix.toLocaleLowerCase('da')) continue;
    if (rest !== '' && !SEPARATORS.test(rest)) continue;
    const short = rest.replace(SEPARATORS, '').trim();
    return short === '' ? name : short;
  }
  return name;
}
