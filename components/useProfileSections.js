import { useContext } from 'react';
import { Alert, Text, View } from 'react-native';

import GlobalStyle from '../styles/GlobalStyle';
import ButtonComponent from './ButtonComponent';
import AccountForm from './AccountForm';
import AddressField from './AddressField';
import BirthDateField from './BirthDateField';
import DiscountProfilePicker from './DiscountProfilePicker';
import CurrentMembershipEditor from './CurrentMembershipEditor';
import PreferencesEditor from './PreferencesEditor';
import { formatKr } from '../data/centerDetail';
import { DISCOUNT_GROUPS } from '../data/matchning';
import { formatBirthDate } from '../data/userProfile';
import { UserContext } from '../data/UserContext';
import { accountErrorMessage } from '../data/account';
import { useCenterData } from '../services/CenterData';

const PREFERENCE_LABELS = {
  sauna: 'Sauna',
  groupClasses: 'Holdtræning',
  open24h: 'Døgnåbent',
  multiCenterAccess: 'Flere centre',
  noBinding: 'Ingen binding',
};

// Kort tekst om Præferencerne, fx "Sauna, Ingen binding · 2 maskiner · maks. 15 km".
function preferencesSummary(preferences) {
  const wishes = Object.keys(PREFERENCE_LABELS)
    .filter((key) => preferences[key])
    .map((key) => PREFERENCE_LABELS[key]);
  const machines = preferences.machines.length;
  return [
    wishes.length > 0 ? wishes.join(', ') : 'Ingen krav',
    machines > 0 ? `${machines} ${machines === 1 ? 'maskine' : 'maskiner'}` : null,
    preferences.maxDistanceKm != null ? `maks. ${preferences.maxDistanceKm} km` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// Profilens sektioner: navn, ikon, en kort tekst om det valgte (vises på Profil) og
// redigeringen (vises på Redigér profil). Ændringer gemmes med det samme.
export function useProfileSections(navigation) {
  const { user, setUser, account, accountsAvailable, createAccount, logOut } =
    useContext(UserContext);
  const { chains } = useCenterData();

  const updateField = (field, value) => {
    setUser((current) => ({ ...current, [field]: value }));
  };

  // Adresse og fødselsdato er krævet. Mens brugeren retter dem til noget ufærdigt (null),
  // beholder Profil den gamle værdi, så appen ikke springer tilbage til onboarding.
  // Felterne viser selv, at den gamle værdi stadig gælder.
  const handleAddress = (place) => {
    if (place) setUser((current) => ({ ...current, ...place }));
  };

  const handleBirthDate = (birthDate) => {
    if (birthDate) updateField('birthDate', birthDate);
  };

  const handleCreateAccount = async (form) => {
    await createAccount(form);
    Alert.alert('Din profil er gemt', 'Du kan nu logge ind med din e-mail på en anden telefon.');
  };

  const handleLogOut = () => {
    Alert.alert(
      'Log ud?',
      'Dine oplysninger fjernes fra denne telefon, men ligger stadig på din konto. Du kan ' +
        'logge ind igen når som helst.',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Log ud',
          style: 'destructive',
          onPress: async () => {
            try {
              await logOut();
            } catch (error) {
              Alert.alert('Kunne ikke logge ud', accountErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  // Kun under udvikling (Expo Go): starter forfra med onboarding som en ny anonym bruger, så
  // onboarding kan testes igen. Den gamle anonyme brugers data bliver liggende i databasen.
  const handleStartOver = () => {
    const message = 'Dine oplysninger fjernes fra telefonen, og onboarding starter igen.';
    Alert.alert('Start forfra?', message, [
      { text: 'Annuller', style: 'cancel' },
      {
        text: 'Start forfra',
        style: 'destructive',
        onPress: async () => {
          try {
            await logOut();
          } catch (error) {
            Alert.alert('Kunne ikke starte forfra', accountErrorMessage(error));
          }
        },
      },
    ]);
  };

  const renderAccount = () => {
    if (!accountsAvailable || !account) {
      return (
        <View style={GlobalStyle.groupPadded}>
          <Text style={GlobalStyle.stepIntro}>Dine oplysninger gemmes kun på denne telefon.</Text>
        </View>
      );
    }

    if (!account.isAnonymous) {
      const accountLabel = account.name ? `${account.name} (${account.email})` : account.email;
      return (
        <View style={GlobalStyle.groupPadded}>
          <Text style={GlobalStyle.stepIntro}>
            Du er logget ind som {accountLabel}. Dine oplysninger, Favoritter og Prisalarmer følger
            din konto.
          </Text>
          <View style={GlobalStyle.accountActions}>
            <ButtonComponent title="Log ud" type="text" onPress={handleLogOut} />
          </View>
        </View>
      );
    }

    return (
      <View style={GlobalStyle.groupPadded}>
        <Text style={GlobalStyle.stepIntro}>
          Du bruger GymFinder anonymt, så dine oplysninger er knyttet til denne telefon. Gem din
          profil, så følger alt med, også Favoritter og Prisalarmer, hvis du skifter telefon.
        </Text>
        <AccountForm mode="create" onSubmit={handleCreateAccount} />
        <View style={GlobalStyle.accountActions}>
          <ButtonComponent
            title="Jeg har allerede en konto"
            type="text"
            onPress={() => navigation.navigate('Log ind')}
          />
        </View>
      </View>
    );
  };

  const membership = user.currentMembership;
  const membershipChain = chains.find((chain) => chain.id === membership?.chainId)?.name;
  let accountSummary = 'Gemmes kun på denne telefon';
  if (account && !account.isAnonymous) accountSummary = account.email;
  else if (accountsAvailable && account) accountSummary = 'Anonym · gem din profil';

  const sections = [
    {
      key: 'address',
      icon: 'home-outline',
      title: 'Adresse',
      summary: user.address || 'Ikke angivet',
      render: () => (
        <AddressField address={user.address} location={user.location} onChange={handleAddress} />
      ),
    },
    {
      key: 'birthDate',
      icon: 'calendar-outline',
      title: 'Fødselsdato',
      summary: formatBirthDate(user.birthDate) || 'Ikke angivet',
      render: () => <BirthDateField birthDate={user.birthDate} onChange={handleBirthDate} />,
    },
    {
      key: 'discountProfile',
      icon: 'pricetag-outline',
      title: 'Rabatprofil',
      summary:
        user.discountProfile.map((group) => DISCOUNT_GROUPS[group]?.label).join(', ') || 'Ingen',
      render: () => (
        <DiscountProfilePicker
          discountProfile={user.discountProfile}
          onChange={(discountProfile) => updateField('discountProfile', discountProfile)}
        />
      ),
    },
    {
      key: 'currentMembership',
      icon: 'card-outline',
      title: 'Nuværende medlemskab',
      summary: membership
        ? `${formatKr(membership.monthlyPrice)}/md${membershipChain ? ` hos ${membershipChain}` : ''}`
        : 'Ingen',
      render: () => (
        <CurrentMembershipEditor
          currentMembership={user.currentMembership}
          chains={chains}
          onChange={(currentMembership) => updateField('currentMembership', currentMembership)}
        />
      ),
    },
    {
      key: 'preferences',
      icon: 'options-outline',
      title: 'Præferencer',
      summary: preferencesSummary(user.preferences),
      render: () => (
        <PreferencesEditor
          preferences={user.preferences}
          onChange={(preferences) => updateField('preferences', preferences)}
        />
      ),
    },
    {
      key: 'account',
      icon: 'person-circle-outline',
      title: 'Konto',
      summary: accountSummary,
      render: renderAccount,
    },
  ];

  return { sections, handleStartOver, canStartOver: Boolean(account?.isAnonymous) };
}
