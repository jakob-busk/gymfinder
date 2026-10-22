# Fitness X-kampagner hentes fra sidens eget admin-ajax-kald

Fitness X' kampagner (fx "Spar 50 % de første to måneder") står ikke i centersidens HTML. Siden henter dem først i browseren med et ekstra POST-kald til WordPress' `admin-ajax.php` med sidens nonce og Centrets medlemskaber. Scraperen laver det samme kald, ét pr. Center, og gemmer svaret som Kampagnepris pr. Aldersgruppe. Uden det ville alle Fitness X-Tilbud mangle deres kampagne og få en for høj Ærlig årspris.

## Konsekvenser

- Kaldet er en intern del af Fitness X' side, ikke et offentligt API. Det kan ændre sig uden varsel. Fejler det, prissættes Centret uden kampagne med en advarsel i nat-rapporten, i stedet for at hele Kæden fejler.
- Antallet af kampagnemåneder står kun i tekst. Kan det ikke læses sikkert, eller passer teksten ikke med prisen, udelades kampagnen.
- Fitness X-delen af nat-jobbet laver ca. dobbelt så mange kald (ca. 68 i stedet for 35).
