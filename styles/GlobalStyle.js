import { StyleSheet } from 'react-native';

const colors = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#1A1A1A',
  background: '#FFFFFF',
  inputBackground: '#F2F2F2',
  backdrop: 'rgba(0, 0, 0, 0.4)',
  error: '#C62828',
  // Pins på kortet på Find: Anbefalet og brugerens egen placering.
  recommendedPin: '#EF6C00',
  userPin: '#1565C0',
};

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
    textAlign: 'center',
    marginBottom: 12,
  },
  ronnieLarge: {
    width: 240,
    height: 172,
    alignSelf: 'center',
    marginBottom: 12,
  },
  ronnieSmall: {
    width: 120,
    height: 86,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalText: {
    color: colors.text,
    lineHeight: 21,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  paragraph: {
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  noticeText: {
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  emptyText: {
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 24,
    textAlign: 'center',
  },
  card: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  priceText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  distanceText: {
    flexShrink: 1,
    color: colors.muted,
    marginBottom: 6,
  },
  notStatedText: {
    flexShrink: 1,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  savingText: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsBox: {
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  detailsHeading: {
    fontWeight: 'bold',
    marginTop: 6,
  },
  // Onboarding: et trin med titel og indhold, og knapperne nederst.
  stepContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepCounter: {
    color: colors.muted,
    marginBottom: 4,
  },
  stepIntro: {
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
    borderTopColor: colors.inputBackground,
  },
  choiceList: {
    gap: 10,
    marginBottom: 12,
  },
  choiceDescription: {
    color: colors.muted,
    marginTop: 2,
    marginLeft: 4,
  },
  fieldLabel: {
    color: colors.text,
    marginBottom: 4,
  },
  errorText: {
    color: colors.error,
    marginBottom: 10,
  },
  confirmedText: {
    color: colors.primary,
    marginBottom: 10,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    backgroundColor: colors.inputBackground,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.text,
    fontWeight: '600',
  },
  // Find: kort med pins og en boks for det valgte Center oven på kortet.
  mapBox: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 6,
  },
  map: {
    flex: 1,
  },
  pinInfo: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
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
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  suggestionText: {
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  // Konto: knapper under formularen og afsnittet på Profil.
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accountBox: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  // Filtre: luft under knapperne nederst, så de ikke ligger helt nede ved kanten.
  filtersContent: {
    paddingBottom: 32,
  },
});

export { colors };
export default GlobalStyle;
