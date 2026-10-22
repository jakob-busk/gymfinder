// Datoer til scraperen, nat-jobbet, stikprøverne og demo-scriptet.

// Dags dato i Danmark som YYYY-MM-DD (svensk datoformat er netop ISO). Jobbet kører om natten
// i UTC, så datoen skal tages i dansk tid for at ramme den rigtige dag.
export const todayInDenmark = (now = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Copenhagen' }).format(now);
