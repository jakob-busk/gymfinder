import { StyleSheet } from 'react-native';

const colors = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  text: '#1A1A1A',
  muted: '#6B6B6B',
  border: '#1A1A1A',
  background: '#FFFFFF',
  inputBackground: '#F2F2F2',
};

const GlobalStyle = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 87,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  distanceText: {
    color: colors.muted,
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
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.text,
    fontWeight: '600',
  },
});

export { colors };
export default GlobalStyle;
