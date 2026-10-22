# Demo-prisfald markeres med de rigtige priser

Demo-scriptet (`npm run demo:prisfald`), der sænker priserne i ét Center for at vise en rigtig push, skriver de rigtige priser på hvert sænket Tilbud (`demoPriceDrop: { date, realPrices }`). Nat-jobbet bruger dem i stedet for demopriserne, når det tjekker sanity-reglen om højst ±50 % ændring på én nat. Uden markeringen kunne to demoer i træk (49 % af prisen) få nattens rigtige pris afvist som en for stor stigning, nat efter nat, så brugerne så falske priser for altid. Et Center med markeringen kan ikke demo-sænkes igen, før nat-jobbet har skrevet rigtige priser, som fjerner markeringen.

Markeringen er bevidst data i den rigtige database. Fjern den ikke uden at løse problemet på en anden måde.
