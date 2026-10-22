# Adresseopslag over nettet, ikke med telefonens geokoder

Adresser og stednavne (onboarding, Profil og Ronnies opslag af andre steder) slås op over nettet: Dataforsyningens GSearch, hvis `EXPO_PUBLIC_DATAFORSYNINGEN_TOKEN` er sat, ellers og som fallback Photon (photon.komoot.io, OpenStreetMap). Telefonens geokoder (`expo-location`'s `geocodeAsync`) kræver adgang til placering på Android, så en bruger, der sagde nej, kunne slet ikke komme igennem onboarding. DAWA, den oplagte gratis danske kilde, lukkede 1. oktober 2026.

## Overvejede muligheder

- **Telefonens geokoder:** gratis og uden nøgle, men kræver placeringstilladelse på Android og giver ingen forslag, mens man skriver.
- **Nominatim:** gratis, men dens brugsregler forbyder autocomplete.
- **Kun GSearch:** de officielle danske adresser, men kræver et token, som ikke må mangle, før appen virker.

## Konsekvenser

- Appen afhænger af en ekstern gratis tjeneste under fair use. Svarer den ikke, får brugeren en dansk fejl og "Prøv igen"; "Brug min placering" virker stadig.
- GSearch giver koordinater i UTM32, som appen regner om til bredde og længde.
