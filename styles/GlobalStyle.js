import { Platform, StyleSheet } from 'react-native';

// GymFinders udseende: "Neon nat". Mørke flader, pink til
// handlinger, turkis/cyan til besparelser og Anbefalet, og glød kun på primærknap, aktiv fane,
// Anbefalet-mærket og Ronnie. Aldrig neon bag priser.
const colors = {
  background: '#0B0F24',
  surface: '#161B3D',
  surfaceRaised: '#1C2250',
  inputBackground: '#1E2450',
  text: '#ECEEFB',
  muted: '#A3AAD1',
  border: '#2E3570',
  borderStrong: '#5B66B0',
  backdrop: 'rgba(3, 5, 15, 0.7)',
  primary: '#FF5CB8',
  onPrimary: '#0B0F24',
  primaryLight: '#3A1E4D',
  accent: '#2EE6EA',
  accentText: '#2EE6EA',
  accentLight: '#12363F',
  badgeBackground: '#2EE6EA',
  badgeText: '#0B0F24',
  error: '#FF7A88',
  warning: '#F2C46D',
  warningLight: '#2B2616',
  // ♥ på Centre, der er Favoritter (og dem, der kan blive det).
  favorite: '#FF5CB8',
  // Pins på kortet på Find: Anbefalet, de andre Centre og brugerens egen placering.
  recommendedPin: '#2EE6EA',
  centerPin: '#FF5CB8',
  userPin: '#8FA0FF',
  tabBar: '#0B0F24',
  tabActive: '#FF5CB8',
  tabInactive: '#6D76A8',
  headerBackground: '#0B0F24',
  headerText: '#ECEEFB',
  glow: 'rgba(255, 92, 184, 0.6)',
  accentGlow: 'rgba(46, 230, 234, 0.55)',
};

// Inter til al tekst, Audiowide til titler og Monoton til logoet.
const fonts = {
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'Audiowide_400Regular',
  logo: 'Monoton_400Regular',
};

const shape = { radius: 14, buttonRadius: 14, cardBorderWidth: 1, titleSize: 24 };

// Neon-detaljerne: logoets farver og glød, linjen under titler, primærknappens gradient og
// baggrundene bag Velkomst, app-ikon og splash.
const brand = {
  logoGlow: 12,
  lineOpacity: 0.85,
  buttonGradient: ['#FF6FC1', '#E2409E'],
  heroGradient: ['#0B0F24', '#1A1450', '#3A1452'],
  iconGradient: ['#0B0F24', '#2A1452'],
  // Mørk kortstil til Google Maps (Android). Apple Maps (iPhone) vises bare mørkt.
  mapStyle: [
    { elementType: 'geometry', stylers: [{ color: '#11163A' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#A3AAD1' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0F24' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262D63' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A2F66' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061A2E' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
};

// Glød: farvet skygge på iOS og web. Android viser ingen farvet skygge.
function glow(color, radius = 12) {
  return Platform.select({
    web: { boxShadow: `0 0 ${radius}px ${color}` },
    ios: {
      shadowColor: color,
      shadowOpacity: 1,
      shadowRadius: radius / 2,
      shadowOffset: { width: 0, height: 0 },
    },
    default: {},
  });
}

const GlobalStyle = StyleSheet.create({
  // Yderste lag på tab-skærme (SafeAreaView), så indhold ikke ligger under statuslinjen.
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Almindelig brødtekst, så den får stilens skrift.
  bodyText: {
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 21,
  },
  // Toppen af fane-skærme (ScreenHeader) og logoet.
  screenHeader: {
    marginBottom: 14,
  },
  screenHeaderTitle: {
    marginBottom: 0,
  },
  neonLine: {
    height: 2,
    marginTop: 10,
    borderRadius: 1,
    opacity: brand.lineOpacity,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: fonts.logo,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: brand.logoGlow,
  },
  logoFirst: {
    color: colors.primary,
    textShadowColor: colors.primary,
  },
  logoSecond: {
    color: colors.accent,
    textShadowColor: colors.accent,
  },
  logoSmall: {
    fontSize: 22,
  },
  logoLarge: {
    fontSize: 34,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  centeredText: {
    fontFamily: fonts.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  // Ronnie i tre størrelser: stor (velkomst, afslutning), mellem (tomme skærme) og lille
  // (avatar og ved hints).
  ronnieLarge: {
    width: 220,
    height: 158,
    alignSelf: 'center',
    marginBottom: 12,
  },
  ronnieSmall: {
    width: 120,
    height: 86,
    alignSelf: 'center',
    marginBottom: 8,
  },
  ronnieTiny: {
    width: 44,
    height: 32,
  },
  // Den aktive fane i fanebjælken gløder.
  tabIconGlow: {
    textShadowColor: colors.glow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  centeredSelf: {
    alignSelf: 'center',
  },
  ronnieGlow: Platform.select({
    web: { filter: `drop-shadow(0 0 10px ${colors.glow})` },
    ios: {
      shadowColor: colors.glow,
      shadowOpacity: 1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
    },
    default: {},
  }),
  // Lille Ronnie med en kort replik (adresse, Rabatprofil, prisfald).
  ronnieHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentLight,
    borderRadius: shape.radius,
    padding: 10,
    marginBottom: 12,
  },
  ronnieHintText: {
    flex: 1,
    fontFamily: fonts.medium,
    color: colors.text,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  modalText: {
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 21,
  },
  title: {
    fontSize: shape.titleSize,
    fontFamily: fonts.display,
    color: colors.text,
    marginBottom: 12,
  },
  paragraph: {
    marginTop: 12,
  },
  spacedBelow: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderWidth: shape.cardBorderWidth,
    borderColor: colors.border,
    borderRadius: shape.radius,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontFamily: fonts.bold,
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
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: shape.cardBorderWidth,
    borderColor: colors.border,
    borderRadius: shape.radius,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitleArea: {
    flex: 1,
    gap: 2,
  },
  badgeInline: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 12,
  },
  cardPrice: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  cardPriceUnit: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  // Anbefalet / Billigst her: turkis/cyan, fordi det handler om den bedste pris.
  badge: {
    backgroundColor: colors.badgeBackground,
    borderRadius: shape.buttonRadius,
    paddingHorizontal: 10,
    paddingVertical: 3,
    ...glow(colors.accentGlow, 10),
  },
  badgeText: {
    color: colors.badgeText,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  // Priser står altid roligt: neutral farve og tal i lige kolonner.
  priceText: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
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
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  savingText: {
    fontFamily: fonts.semibold,
    color: colors.accentText,
    marginBottom: 6,
  },
  link: {
    fontFamily: fonts.semibold,
    color: colors.primary,
    marginBottom: 8,
  },
  detailsBox: {
    backgroundColor: colors.inputBackground,
    borderRadius: Math.max(shape.radius - 6, 6),
    padding: 10,
    marginBottom: 10,
  },
  detailsHeading: {
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 6,
  },
  // Velkomst: logo og tagline øverst, Ronnie i midten, tre punkter og knapperne nederst.
  welcome: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  welcomeTop: {
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  welcomeTagline: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
  },
  welcomePoints: {
    gap: 10,
  },
  welcomePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  welcomePointText: {
    flex: 1,
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 20,
  },
  welcomeActions: {
    gap: 10,
  },
  // Onboarding: et trin med titel og indhold, og knapperne nederst.
  stepContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepCounter: {
    fontFamily: fonts.medium,
    color: colors.muted,
    marginBottom: 4,
  },
  stepIntro: {
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 16,
  },
  stepFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
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
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 4,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.error,
    marginBottom: 10,
  },
  confirmedText: {
    fontFamily: fonts.body,
    color: colors.accentText,
    marginBottom: 10,
  },
  // Adressefeltet: forslagene under feltet, mens brugeren skriver.
  addressSuggestions: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    marginTop: -6,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  addressSuggestion: {
    paddingVertical: 10,
    paddingHorizontal: 8,
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
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: Math.min(shape.radius, 10),
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontFamily: fonts.body,
  },
  // Knapper: primær (den ene handling på skærmen), sekundær (rolig flade), tekst (som et link)
  // og lille (i rækker og kort). Samme højde overalt, så de står pænt side om side.
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: shape.buttonRadius,
    minHeight: 46,
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    overflow: 'hidden',
    ...glow(colors.glow, 14),
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: shape.buttonRadius,
    minHeight: 46,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  buttonText: {
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  buttonGhost: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: shape.buttonRadius,
    minHeight: 40,
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  buttonSmall: {
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  buttonFull: {
    alignSelf: 'stretch',
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonTextPrimary: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
    fontSize: 15,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  buttonTextSecondary: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
  buttonTextText: {
    color: colors.primary,
    fontFamily: fonts.semibold,
    fontSize: 15,
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
  // Valg-kontroller: mærker man slår til og fra, et segment-valg, en række med en kontakt,
  // et felt der åbner en liste (dropdown) og grupper af rækker som i Indstillinger.
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
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  chipTextSelected: {
    color: colors.text,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: shape.buttonRadius,
    padding: 3,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderRadius: shape.buttonRadius - 3,
  },
  segmentActive: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  segmentText: {
    fontFamily: fonts.medium,
    color: colors.muted,
  },
  segmentTextActive: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: shape.buttonRadius,
    minHeight: 40,
    paddingHorizontal: 12,
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
    marginBottom: 12,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sheetOptionText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  groupTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: shape.radius,
    overflow: 'hidden',
  },
  groupPadded: {
    padding: 14,
  },
  groupSpaced: {
    marginBottom: 10,
  },
  fill: {
    flex: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 14,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  settingsIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
  },
  settingsText: {
    flex: 1,
  },
  settingsLabel: {
    fontFamily: fonts.medium,
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
    marginHorizontal: -14,
    marginBottom: -14,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cardSectionAction: {
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    marginTop: -8,
    paddingBottom: 4,
  },
  stickyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  // Find: kort med pins og en boks for det valgte Center oven på kortet.
  mapBox: {
    height: 260,
    borderRadius: shape.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  map: {
    flex: 1,
  },
  // Kortet på web (localhost), hvor react-native-maps ikke virker.
  webMap: {
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    padding: 10,
    gap: 8,
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 220,
  },
  webMapPinText: {
    color: '#FFFFFF',
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  pinInfo: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    columnGap: 10,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  suggestionText: {
    fontFamily: fonts.body,
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
    borderWidth: shape.cardBorderWidth,
    borderColor: colors.border,
    borderRadius: shape.radius,
    padding: 12,
    marginBottom: 24,
  },
  // Luft nederst i lange skærme, så det sidste ikke ligger helt nede ved kanten.
  scrollEnd: {
    paddingBottom: 48,
  },
  // Filtre: luft under knapperne nederst, så de ikke ligger helt nede ved kanten.
  filtersContent: {
    paddingBottom: 32,
  },
  // Centerdetalje: gebyrrækker, prisudregning måned for måned og advarsler.
  mutedText: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  cardHighlighted: {
    borderColor: colors.accent,
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
    borderTopColor: colors.borderStrong,
    marginTop: 4,
    paddingTop: 6,
  },
  // Centerdetalje: Tilbuddene som faner og kvitteringen for det valgte Tilbud.
  offerTabs: {
    gap: 8,
    paddingBottom: 12,
  },
  offerTab: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: shape.radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  offerTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  offerTabText: {
    fontFamily: fonts.semibold,
    color: colors.muted,
  },
  offerTabTextActive: {
    color: colors.text,
  },
  offerTabPrice: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  receipt: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: 4,
    padding: 16,
  },
  receiptKicker: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 6,
  },
  receiptDivider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    marginVertical: 10,
  },
  receiptTotalLine: {
    borderTopWidth: 3,
    borderColor: colors.text,
    marginVertical: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
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
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
  },
  receiptTotal: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  facilityCell: {
    width: '50%',
    paddingRight: 8,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: shape.radius,
    padding: 12,
    marginBottom: 12,
  },
  warningTitle: {
    color: colors.warning,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  // Favoritter: ♥-knappen og rækkerne på Favoritter-skærmen.
  shrinkText: {
    flexShrink: 1,
  },
  favoriteButton: {
    paddingHorizontal: 4,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteInfo: {
    flex: 1,
  },
  priceDropText: {
    color: colors.accentText,
    fontFamily: fonts.semibold,
  },
  priceRiseText: {
    fontFamily: fonts.body,
    color: colors.muted,
  },
  // Spørg Ronnie: chatbobler (brugeren til højre, Ronnie til venstre med avatar) og inputfeltet.
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  ronnieAvatar: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  bubble: {
    borderRadius: shape.radius,
    padding: 12,
    marginTop: 12,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  bubbleRonnie: {
    flexShrink: 1,
    marginTop: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleUserText: {
    color: colors.onPrimary,
    fontFamily: fonts.semibold,
  },
  bubbleText: {
    fontFamily: fonts.body,
    color: colors.text,
    lineHeight: 20,
  },
  chatButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginLeft: 48,
  },
  // Ronnies første besked: Ronnie i mellemstørrelse med en lille taleboble ved siden af, og
  // forslagene centreret under.
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
    borderBottomLeftRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  chatInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontFamily: fonts.body,
  },
});

export { brand, colors, fonts };
export default GlobalStyle;
