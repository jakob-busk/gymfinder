import { Easing, Platform, StyleSheet } from 'react-native';

// GymFinders udseende: "Tribune, men venlig" (variant 7). Rytmen og bevægelsen fra Tribune: store
// pristal, det Anbefalede Center som en mørk blæk-blok mellem lyse kort, løbenumre, felter som
// blanket-linjer og lister, der toner ind forskudt. Varmen fra "Varm og venlig": creme papir,
// rundere hjørner, Nunito og Fredoka og Ronnie på en lys cirkel med talebobler.
// Farverne er creme/papir, blæk og violet, og ikke flere (plus dæmpet rød til fejl). Violet er kun
// handling (knapper, ♥, logo-prik, aktiv fane, kontakter, din placering); alt andet er blæk. Godt nyt
// (Anbefalet, besparelser, prisfald) får ingen ekstra farve, men vises med form og kontrast: den mørke
// blæk-blok, lyse piller med blæk-kant og blæk på papir. Ingen af farverne ligner en Kædes (Fitness X
// er orange, PureGym grøn/turkis, SATS rød/mørkeblå). Kun to flader (creme
// og lyst papir), ingen skygger, aldrig ren sort eller hvid, og aldrig farve bag selve prisen.
// Vægtene er rolige: Fredoka 600/500 til titler, Nunito 700 kun til pristal, ellers 600 og 400.
const colors = {
  background: '#FDF1E0',
  surface: '#FFFCF7',
  inputBackground: '#FFFCF7',
  text: '#1B1915',
  muted: '#6B6358',
  border: 'rgba(27, 25, 21, 0.10)',
  borderStrong: 'rgba(27, 25, 21, 0.24)',
  backdrop: 'rgba(27, 25, 21, 0.45)',
  // Blæk-blokken: det Anbefalede Center, aktive valg og brugerens chatbobler.
  ink: '#1B1915',
  onInk: '#F7F1E8',
  onInkMuted: '#A8A193',
  // Handling: dyb violet. Den lyse udgave er Ronnies cirkel og baggrund bag aktive ting.
  primary: '#5B3CD6',
  onPrimary: '#FFFCF7',
  primaryLight: '#E7E0FB',
  // Fejl er dæmpet rød. Advarsler har ingen egen farve; de står i blæk med et ikon og en kant.
  error: '#B4382E',
  // ♥ på Centre, der er Favoritter (og dem, der kan blive det).
  favorite: '#5B3CD6',
  // Din egen placering på kortet er violet. Centrenes pins er blæk og papir (se mapPin*).
  userPin: '#5B3CD6',
  tabBar: '#FDF1E0',
  tabActive: '#5B3CD6',
  tabInactive: '#6B6358',
  headerBackground: '#FDF1E0',
  headerText: '#1B1915',
};

// To familier: Nunito til al tekst og alle priser (runde ender, men tal i lige kolonner) og
// Fredoka til titler og logo. Et trin lettere end før, så det føles roligt: brødtekst 400,
// fremhævninger, knapper og mærker 600, kun pristal i 700.
const fonts = {
  body: 'Nunito_400Regular',
  medium: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_600SemiBold',
  figure: 'Nunito_700Bold',
  display: 'Fredoka_600SemiBold',
  displayMedium: 'Fredoka_500Medium',
  logo: 'Fredoka_600SemiBold',
};

// Store flader er bløde, knapper og mærker er piller, og kvitteringen er lidt skarpere som en bon.
const shape = { radius: 24, blockRadius: 32, receiptRadius: 12, pill: 999, titleSize: 30 };

// Bevægelse: én blød "power4.out"-kurve til næsten alt, og en kurve med lidt fjeder til tryk.
// Kun transform og opacity animeres, så det holder 60 fps. På web findes ingen native driver,
// så dér kører animationerne i JS.
const motion = {
  native: Platform.OS !== 'web',
  easeOut: Easing.bezier(0.16, 1, 0.3, 1),
  easeInOut: Easing.bezier(0.76, 0, 0.24, 1),
  micro: 150,
  small: 260,
  medium: 520,
  large: 760,
  stagger: 70,
  // Højst så mange elementer forskydes; resten kommer samtidig, så lange lister ikke venter.
  maxStagger: 8,
  pressScale: 0.96,
};

// Lys, neutral kortstil til Google Maps (Android) i creme og grå, så pins i blæk og violet
// er det eneste med farve.
const brand = {
  mapInterfaceStyle: 'light',
  mapStyle: [
    { elementType: 'geometry', stylers: [{ color: '#F6EDE0' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6B6358' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#FDF1E0' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFCF7' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E8DFD2' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DEDAD3' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

// Store titler i Fredoka: tæt linjeafstand og kun let negativ spærring. Fredoka er bred og rund,
// så Tribunes stramme spærring (-4,5 %) får bogstaverne til at klumpe; -1,5 % holder plakat-
// følelsen. Linjehøjden er lidt over 1, fordi Fredoka har høje accenter (Æ, Ø, Å).
const display = (size, tracking = -0.015) => ({
  fontFamily: fonts.display,
  fontSize: size,
  lineHeight: Math.round(size * 1.04),
  letterSpacing: size * tracking,
  color: colors.text,
});

// Store pristal i Nunito Bold med tal i lige kolonner, så priser kan sammenlignes på et blik.
const figure = (size, tracking = -0.03) => ({
  fontFamily: fonts.figure,
  fontSize: size,
  lineHeight: Math.round(size * 1.02),
  letterSpacing: size * tracking,
  color: colors.text,
  fontVariant: ['tabular-nums'],
});

// Små etiketter over sektioner, i mærker og ved felter. Ingen versaler og ingen bred spærring
// (det ligner et skabelon-design); de skrives med stort begyndelsesbogstav og får hierarki med
// vægt, størrelse og farve i stedet.
const kicker = {
  fontFamily: fonts.bold,
  fontSize: 13,
  color: colors.muted,
};

// Ronnies scene: cirklen ligger bag ham og er lidt mindre end billedet, så hænderne stikker ud over
// kanten, som et klistermærke.
function ronnieStage(width, height, circle) {
  return {
    stage: { width, height, alignItems: 'center', justifyContent: 'center' },
    circle: {
      position: 'absolute',
      width: circle,
      height: circle,
      borderRadius: circle / 2,
      top: (height - circle) / 2,
      left: (width - circle) / 2,
    },
  };
}
const ronnieLargeScene = ronnieStage(240, 200, 186);
const ronnieSmallScene = ronnieStage(150, 128, 116);
const ronnieHintScene = ronnieStage(60, 60, 56);

const GlobalStyle = StyleSheet.create({
  // Yderste lag på tab-skærme (SafeAreaView), så indhold ikke ligger under statuslinjen.
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Almindelig brødtekst, så den får stilens skrift.
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
  },
  // Toppen af fane-skærme (ScreenHeader): stor titel og en tynd blæklinje under.
  screenHeader: {
    marginBottom: 18,
  },
  screenHeaderTitle: {
    marginBottom: 0,
  },
  headerRule: {
    height: 3,
    borderRadius: 2,
    marginTop: 12,
    backgroundColor: colors.text,
  },
  // Logoet: "GymFinder" i Fredoka med en lille violet prik, der pulserer svagt.
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoText: {
    fontFamily: fonts.logo,
    color: colors.text,
  },
  logoSmall: {
    fontSize: 27,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  logoLarge: {
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.5,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 3,
    marginBottom: 7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  centeredText: {
    fontFamily: fonts.body,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  // Ronnie i fem størrelser: stor (Velkomst, afslutning), lille (tomme skærme), ved en taleboble,
  // avatar (ved Ronnies beskeder) og mini (i knapper). Billedet er 791 × 566, så højden er
  // bredde / 1,4. Cirklen bag ham er altid lys violet.
  ronnieLarge: {
    width: 240,
    height: 172,
  },
  ronnieSmall: {
    width: 150,
    height: 107,
  },
  ronnieHintImage: {
    width: 58,
    height: 41,
  },
  ronnieTiny: {
    width: 34,
    height: 24,
  },
  ronnieLargeStage: { ...ronnieLargeScene.stage, marginVertical: 8 },
  ronnieLargeCircle: { ...ronnieLargeScene.circle, backgroundColor: colors.primaryLight },
  ronnieSmallStage: { ...ronnieSmallScene.stage, marginVertical: 6 },
  ronnieSmallCircle: { ...ronnieSmallScene.circle, backgroundColor: colors.primaryLight },
  ronnieHintStage: ronnieHintScene.stage,
  ronnieHintCircle: { ...ronnieHintScene.circle, backgroundColor: colors.primaryLight },
  ronnieAvatarStage: {
    backgroundColor: colors.primaryLight,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  centeredSelf: {
    alignSelf: 'center',
  },
  // Ronnie med en kort replik i en taleboble (adresse, Rabatprofil, prisfald, Find henter).
  ronnieHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  ronnieHintBubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  // Taleboblens spids: en drejet firkant i boblens farve. Til venstre peger den mod Ronnie ved
  // siden af, nedad peger den mod Ronnie under boblen.
  bubbleTail: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  bubbleTailLeft: {
    left: -6,
    top: '50%',
    marginTop: -7,
    transform: [{ rotate: '45deg' }],
  },
  bubbleTailDown: {
    bottom: -6,
    left: '50%',
    marginLeft: -7,
    transform: [{ rotate: '45deg' }],
  },
  ronnieHintText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: shape.blockRadius,
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    ...display(22, -0.01),
    flexShrink: 1,
  },
  modalText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
  },
  title: {
    ...display(shape.titleSize),
    marginBottom: 14,
  },
  paragraph: {
    marginTop: 12,
  },
  spacedBelow: {
    marginBottom: 16,
  },
  sectionLabel: {
    ...display(20, -0.01),
    marginTop: 28,
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    padding: 18,
    marginBottom: 12,
  },
  infoTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    letterSpacing: -0.1,
    color: colors.text,
    marginBottom: 4,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  noticeText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 22,
    marginTop: 20,
    textAlign: 'center',
  },
  // Kort for ét Center: lyst papir, et løbenummer, navnet og prisen som et stort tal.
  card: {
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    padding: 20,
    marginBottom: 12,
  },
  // Det Anbefalede Center er en mørk blok, så det står ud uden at råbe.
  cardHighlighted: {
    backgroundColor: colors.ink,
    borderRadius: shape.blockRadius,
    paddingVertical: 20,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardIndex: {
    ...kicker,
    fontVariant: ['tabular-nums'],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  cardTitleArea: {
    flex: 1,
    gap: 4,
  },
  badgeInline: {
    alignSelf: 'flex-start',
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 18,
    marginBottom: 6,
  },
  cardPrice: {
    ...figure(44, -0.03),
    lineHeight: 45,
  },
  cardPriceUnitBox: {
    paddingBottom: 6,
    gap: 1,
  },
  cardPriceUnit: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  cardPriceCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.text,
  },
  // Kædens logo: lyst logo på en lille blæk-pille, samme højde for alle Kæder (se ChainLogo).
  chainPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: shape.pill,
    backgroundColor: colors.ink,
  },
  // På blæk-blokken får pillen en svag lys kant, så den stadig kan ses som en pille.
  chainPillOnInk: {
    borderWidth: 1,
    borderColor: 'rgba(168, 161, 147, 0.45)',
  },
  chainLogo: {
    tintColor: colors.onInk,
  },
  chainPillText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.onInk,
  },
  // Kædens logo og afstanden på én linje under navnet.
  chainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  // Tekst i den mørke blok.
  textOnInk: {
    color: colors.onInk,
  },
  mutedOnInk: {
    color: colors.onInkMuted,
  },
  priceOnInk: {
    color: colors.onInk,
  },
  // Anbefalet / Billigst her: lys pille med blæk-kant og blæk-tekst. Den samme pille virker både
  // på blæk-blokken (lys mod mørk) og på lyst papir (kanten tegner den).
  badge: {
    backgroundColor: colors.onInk,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: shape.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...kicker,
    fontSize: 12,
    color: colors.text,
  },
  // Priser står altid roligt: neutral farve og tal i lige kolonner.
  priceText: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  bigPrice: {
    ...figure(34),
  },
  distanceText: {
    flexShrink: 1,
    fontFamily: fonts.body,
    color: colors.muted,
    marginBottom: 6,
  },
  notStatedText: {
    flexShrink: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginBottom: 6,
  },
  // Besparelse: en pille i cremefarve med blæk-kant og blæk-tekst, så det gode nyt kan ses på
  // afstand uden en ekstra farve.
  savingText: {
    alignSelf: 'flex-start',
    fontFamily: fonts.semibold,
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  link: {
    fontFamily: fonts.semibold,
    color: colors.text,
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  detailsBox: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
  },
  detailsHeading: {
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 6,
  },
  // Velkomst: logo, en kæmpe overskrift, Ronnie på sin cirkel med en taleboble, et skråt bånd med
  // prisbegreber,
  // tre nummererede punkter og knapperne nederst.
  welcomeRoot: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  welcome: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    justifyContent: 'space-between',
    gap: 18,
  },
  welcomeTop: {
    gap: 22,
    marginTop: 12,
  },
  welcomeTagline: {
    ...display(34, -0.015),
    lineHeight: 37,
  },
  // "billigst" står omvendt: lys tekst på en blæk-markering.
  welcomeHighlight: {
    backgroundColor: colors.ink,
    color: colors.onInk,
    borderRadius: 10,
  },
  welcomeRonnie: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: -8,
    marginRight: -8,
  },
  welcomeBubble: {
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    paddingVertical: 9,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  welcomeBubbleText: {
    fontFamily: fonts.displayMedium,
    fontSize: 17,
    color: colors.text,
  },
  welcomePoints: {
    borderTopWidth: 1.5,
    borderTopColor: colors.text,
  },
  welcomePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderStrong,
  },
  welcomePointNumber: {
    ...kicker,
    color: colors.text,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  welcomePointText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  welcomeActions: {
    gap: 6,
  },
  // Det skrå bånd, der løber hen over Velkomst (en stille, levende detalje).
  marquee: {
    backgroundColor: colors.ink,
    marginHorizontal: -48,
    paddingVertical: 10,
    overflow: 'hidden',
    transform: [{ rotate: '-3deg' }],
  },
  marqueeTrack: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  marqueeText: {
    flexShrink: 0,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: -0.1,
    color: colors.onInk,
  },
  marqueeStar: {
    color: colors.onInkMuted,
  },
  // Onboarding: et trin med fremdriftsbjælke, stor titel, indhold og knapperne nederst.
  stepContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  stepCounter: {
    ...kicker,
    marginBottom: 10,
  },
  stepProgress: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 18,
  },
  stepProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  stepProgressFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.text,
  },
  stepIntro: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
    marginBottom: 18,
  },
  stepFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  choiceList: {
    gap: 10,
    marginBottom: 12,
  },
  choiceDescription: {
    fontFamily: fonts.body,
    color: colors.muted,
    marginTop: 2,
    marginLeft: 4,
  },
  fieldLabel: {
    ...kicker,
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  errorText: {
    fontFamily: fonts.medium,
    color: colors.error,
    marginBottom: 10,
  },
  confirmedText: {
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 10,
  },
  // Adressefeltet: forslagene under feltet, mens brugeren skriver.
  addressSuggestions: {
    borderRadius: 16,
    marginTop: -4,
    marginBottom: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  addressSuggestion: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  addressSuggestionText: {
    fontFamily: fonts.body,
    color: colors.text,
  },
  // Fødselsdato: datovælgeren på iPhone, under feltet.
  datePickerBox: {
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  // Felter: papir med en blæklinje under, som en blanket, i stedet for en kasse. Hjørnerne
  // foroven er bløde, så feltet ikke føles som et skema.
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.text,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  // Knapper: primær (den ene handling på skærmen, violet pille), sekundær (blæk-omrids), tekst
  // (understreget som et link) og ghost (rolig flade). Alle trykkes ind med en lille fjeder.
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: shape.pill,
    minHeight: 50,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.text,
    borderRadius: shape.pill,
    minHeight: 50,
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  buttonText: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  buttonGhost: {
    backgroundColor: colors.surface,
    borderRadius: shape.pill,
    minHeight: 42,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonSmall: {
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  buttonFull: {
    alignSelf: 'stretch',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonTextPrimary: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonTextSecondary: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
  buttonTextText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  buttonTextGhost: {
    color: colors.text,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  buttonTextSmall: {
    fontSize: 13,
  },
  // Knapper i den mørke blok: omrids og tekst i lys farve.
  buttonOnInk: {
    borderColor: colors.onInk,
    backgroundColor: 'transparent',
  },
  buttonTextOnInk: {
    color: colors.onInk,
  },
  // Valg-kontroller: mærker man slår til og fra, et segment-valg med en glidende markør, en række
  // med en kontakt, et felt der åbner en liste (dropdown) og grupper af rækker som i Indstillinger.
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: shape.pill,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: fonts.medium,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.onInk,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: shape.pill,
    padding: 4,
    marginBottom: 14,
  },
  segmentIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: shape.pill,
    backgroundColor: colors.ink,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: shape.pill,
  },
  segmentActive: {},
  segmentText: {
    fontFamily: fonts.semibold,
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.onInk,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginTop: 2,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: shape.pill,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectLabel: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 13,
  },
  selectValue: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 14,
  },
  selectValueFull: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: shape.blockRadius,
    borderTopRightRadius: shape.blockRadius,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 16,
  },
  sheetTitle: {
    ...display(24, -0.01),
    marginBottom: 10,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  sheetOptionText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  // Overskrift over en gruppe (fx Maks. afstand, Krav): lille Fredoka i blæk, ikke versaler.
  groupTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 18,
    color: colors.text,
    marginTop: 26,
    marginBottom: 10,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    overflow: 'hidden',
  },
  groupPadded: {
    padding: 18,
  },
  groupSpaced: {
    marginBottom: 12,
  },
  fill: {
    flex: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
    marginLeft: 18,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  settingsIcon: {
    width: 34,
    height: 34,
    borderRadius: shape.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  settingsText: {
    flex: 1,
  },
  settingsLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  settingsLabelDanger: {
    color: colors.error,
  },
  settingsValue: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  // Nederste del af et kort, adskilt med en tynd linje (fx Prisalarm på en Favorit).
  cardSection: {
    marginHorizontal: -20,
    marginBottom: -20,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  cardSectionAction: {
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    marginTop: -8,
    paddingBottom: 6,
  },
  stickyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  // Find: kort med pins og en boks for det valgte Center oven på kortet.
  mapBox: {
    height: 250,
    borderRadius: shape.blockRadius,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  map: {
    flex: 1,
  },
  // Kortet på web (localhost), hvor react-native-maps ikke virker.
  webMap: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  webMapScroll: {
    flexGrow: 0,
  },
  webMapPins: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  webMapPin: {
    borderRadius: shape.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 220,
  },
  webMapPinText: {
    color: colors.onInk,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  webMapPinTextRecommended: {
    color: colors.text,
  },
  pinInfo: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    padding: 16,
  },
  pinInfoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  mapLegend: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 6,
  },
  legendCount: {
    ...kicker,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  legendDot: {
    marginBottom: 8,
  },
  // Pins: Anbefalet er en stor papirprik med tyk blæk-ring, de andre Centre er små blækprikker med
  // en papirkant, så de kan ses på kortet. Bruges både på kortet (native) og i forklaringen.
  mapPinRecommended: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderColor: colors.ink,
  },
  mapPinCenter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  mapPinUser: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.userPin,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  // På web er Centrene piller: Anbefalet papir med blæk-kant, de andre blæk.
  webMapPinRecommended: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  webMapPinCenter: {
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  suggestionText: {
    fontFamily: fonts.medium,
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  // Konto: knapper under formularen og afsnittet på Profil.
  accountActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accountBox: {
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    padding: 18,
    marginBottom: 24,
  },
  // Luft nederst i lange skærme, så det sidste ikke ligger helt nede ved kanten.
  scrollEnd: {
    paddingBottom: 56,
  },
  // Filtre: luft under knapperne nederst, så de ikke ligger helt nede ved kanten.
  filtersContent: {
    paddingBottom: 32,
  },
  // Centerdetalje: gebyrrækker, prisudregning måned for måned og advarsler.
  mutedText: {
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  // Centerdetalje: Kædens logo, adresse og afstand under navnet.
  detailHeroMetaRow: {
    marginBottom: 20,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  feeLabel: {
    flexShrink: 1,
    fontFamily: fonts.body,
    color: colors.text,
  },
  feeValue: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.text,
    marginTop: 4,
    paddingTop: 6,
  },
  // Centerdetalje: Tilbuddene som piller og kvitteringen for det valgte Tilbud.
  offerTabs: {
    gap: 8,
    paddingBottom: 16,
  },
  offerTab: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: shape.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offerTabActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  offerTabText: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  offerTabTextActive: {
    color: colors.onInk,
  },
  offerTabPrice: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  offerTabPriceActive: {
    color: colors.onInkMuted,
  },
  // Kvitteringen: en bon på lyst papir (lidt skarpere hjørner end kortene) med stiplede linjer og
  // en stor total nederst.
  receipt: {
    backgroundColor: colors.surface,
    borderRadius: shape.receiptRadius,
    padding: 20,
  },
  receiptKicker: {
    ...kicker,
    marginBottom: 10,
  },
  receiptDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    marginVertical: 12,
  },
  receiptTotalLine: {
    height: 3,
    backgroundColor: colors.text,
    marginTop: 10,
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  receiptLabel: {
    fontFamily: fonts.medium,
    color: colors.text,
  },
  receiptValue: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  receiptTotalLabel: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: -0.1,
    color: colors.text,
  },
  receiptTotal: {
    ...figure(34),
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Faciliteter som små bento-felter, to pr. række.
  facilityCell: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
  },
  // Advarsel: lyst papir med en blæk-kant og et ikon ved titlen, ingen gul.
  warningBox: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: shape.radius,
    padding: 18,
    marginBottom: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  warningTitle: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 18,
  },
  // Favoritter: ♥-knappen og rækkerne på Favoritter-skærmen.
  shrinkText: {
    flexShrink: 1,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: shape.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  favoriteButtonOnInk: {
    backgroundColor: 'rgba(247, 241, 232, 0.10)',
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  favoriteChain: {
    marginTop: 4,
    marginBottom: 6,
  },
  favoriteInfo: {
    flex: 1,
    gap: 2,
  },
  // Prisfald: samme pille som en besparelse.
  priceDropText: {
    alignSelf: 'flex-start',
    color: colors.text,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginVertical: 4,
    fontFamily: fonts.semibold,
  },
  priceRiseText: {
    fontFamily: fonts.body,
    color: colors.muted,
    marginVertical: 4,
  },
  // Spørg Ronnie: chatbobler (brugeren til højre i blæk, Ronnie til venstre på papir).
  chatContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 14,
  },
  bubble: {
    borderRadius: shape.radius,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 14,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: colors.ink,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  bubbleRonnie: {
    flexShrink: 1,
    marginTop: 0,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
  },
  bubbleUserText: {
    color: colors.onInk,
    fontFamily: fonts.medium,
    lineHeight: 21,
  },
  bubbleText: {
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 21,
  },
  chatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 48,
  },
  // Ronnies første besked: Ronnie på sin cirkel med en taleboble (med spids) ved siden af, og forslagene under.
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  greetingBubble: {
    maxWidth: 190,
    borderRadius: shape.radius,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  chatSuggestions: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  chatInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 50,
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  // Fanebjælken: den aktive fane får en violet pille bag ikonet, der vokser frem.
  tabIcon: {
    width: 52,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconPill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: shape.pill,
    backgroundColor: colors.primary,
  },
});

export { brand, colors, fonts, motion };
export default GlobalStyle;
