import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import FindScreen from './screens/FindScreen';
import AskRonnieScreen from './screens/AskRonnieScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ProfileScreen from './screens/ProfileScreen';
import AboutScreen from './screens/AboutScreen';
import LoginScreen from './screens/LoginScreen';
import CenterDetailScreen from './screens/CenterDetailScreen';
import FiltersScreen from './screens/FiltersScreen';
import WelcomeScreen from './screens/Onboarding/WelcomeScreen';
import AddressScreen from './screens/Onboarding/AddressScreen';
import BirthDateScreen from './screens/Onboarding/BirthDateScreen';
import DiscountProfileScreen from './screens/Onboarding/DiscountProfileScreen';
import CurrentMembershipScreen from './screens/Onboarding/CurrentMembershipScreen';
import PreferencesScreen from './screens/Onboarding/PreferencesScreen';
import FinishScreen from './screens/Onboarding/FinishScreen';
import { UserContext } from './data/UserContext';
import { accountsAvailable, useAuthSession } from './services/Auth';
import { useCenterData } from './services/CenterData';
import { useFavorites } from './services/Favorites';
import {
  initNotificationHandler,
  listenForAlertTaps,
  usePriceAlertCheck,
} from './services/Notifications';
import { useCurrentMembershipAlert } from './services/PriceAlerts';
import { useUserProfile } from './services/UserProfile';
import GlobalStyle, { colors } from './styles/GlobalStyle';

// Prisalarmer vises også som notifikation, mens appen er åben.
initNotificationHandler();

// Bruges til at åbne Centerdetalje, når brugeren trykker på en Prisalarm.
const navigationRef = createNavigationContainerRef();

const RootStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Find: 'search',
  'Spørg Ronnie': 'chatbubbles',
  Favoritter: 'heart',
  Profil: 'person',
};

const stackHeader = { headerTintColor: colors.primary, headerBackTitle: 'Tilbage' };

// Profil-fanen er en stack, så Om os og Log ind åbnes oven på Profil, og fanebjælken bliver
// stående.
function ProfileTab() {
  return (
    <ProfileStack.Navigator screenOptions={stackHeader}>
      <ProfileStack.Screen
        name="ProfilForside"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen name="Om os" component={AboutScreen} />
      <ProfileStack.Screen name="Log ind" component={LoginScreen} />
    </ProfileStack.Navigator>
  );
}

// De fire faner i bunden: Find, Spørg Ronnie, Favoritter og Profil.
function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Find" component={FindScreen} />
      <Tab.Screen name="Spørg Ronnie" component={AskRonnieScreen} />
      <Tab.Screen name="Favoritter" component={FavoritesScreen} />
      <Tab.Screen name="Profil" component={ProfileTab} />
    </Tab.Navigator>
  );
}

// Onboarding første gang: velkomst med Ronnie → adresse → fødselsdato → Rabatprofil →
// Nuværende medlemskab → Præferencer → gem profil eller fortsæt anonymt. Fra velkomsten kan en
// bruger med konto logge ind i stedet.
function onboardingScreens() {
  return (
    <>
      <RootStack.Screen name="Velkomst" component={WelcomeScreen} options={{ headerShown: false }} />
      <RootStack.Screen name="Log ind" component={LoginScreen} />
      <RootStack.Screen name="Adresse" component={AddressScreen} />
      <RootStack.Screen name="Fødselsdato" component={BirthDateScreen} />
      <RootStack.Screen name="Rabatprofil" component={DiscountProfileScreen} />
      <RootStack.Screen
        name="Medlemskab"
        component={CurrentMembershipScreen}
        options={{ title: 'Nuværende medlemskab' }}
      />
      <RootStack.Screen name="Præferencer" component={PreferencesScreen} />
      <RootStack.Screen name="Klar" component={FinishScreen} />
    </>
  );
}

// Fanerne nederst, og Centerdetalje og Filtre som stack oven på fanerne.
function appScreens() {
  return (
    <>
      <RootStack.Screen name="Faner" component={Tabs} options={{ headerShown: false }} />
      <RootStack.Screen
        name="CenterDetaljer"
        component={CenterDetailScreen}
        options={{ title: 'Center' }}
      />
      <RootStack.Screen name="Filtre" component={FiltersScreen} />
    </>
  );
}

// Appens navigation. Onboarding vises, indtil den er gennemført; derefter fanerne.
// Brugerens profil deles med alle skærme via UserContext og gemmes automatisk.
export default function App() {
  // Firebase-brugeren (anonym ved første opstart). null, hvis Firebase ikke er sat op.
  // Ved log ind skifter uid'et, og profilen for kontoen hentes.
  const { authUser, account, authReady, createAccount, logIn, logOut } = useAuthSession();

  const { user, setUser, loading, showOnboarding, completeOnboarding } = useUserProfile({
    authReady,
    uid: authUser?.uid ?? null,
  });

  // Favoritter følger samme uid som profilen og gemmes under Users/<uid>/favorites.
  const favorites = useFavorites({ authReady, uid: authUser?.uid ?? null });

  // Prisalarm på Nuværende medlemskab (Users/<uid>/currentMembershipAlert).
  const membershipAlert = useCurrentMembershipAlert({ authReady, uid: authUser?.uid ?? null });

  // Tryk på en Prisalarm (lokal eller push fra nat-jobbet) åbner Centerdetalje.
  const [navigationReady, setNavigationReady] = useState(false);
  const appReady = navigationReady && !loading && !showOnboarding;
  const openCenter = useCallback((centerId) => {
    if (navigationRef.isReady()) navigationRef.navigate('CenterDetaljer', { centerId });
  }, []);

  useEffect(() => {
    if (!appReady) return undefined;
    return listenForAlertTaps(openCenter);
  }, [appReady, openCenter]);

  // Sikkerhedsnet: ved app-åbning tjekkes Prisalarmerne mod de aktuelle priser.
  const centerData = useCenterData();
  usePriceAlertCheck({
    ready: appReady && !favorites.loading && !membershipAlert.loading && !centerData.loading,
    uid: authUser?.uid ?? null,
    user,
    favorites,
    membershipAlert,
    centers: centerData.centers,
    chains: centerData.chains,
    onOpenCenter: openCenter,
  });

  const userContext = useMemo(
    () => ({
      user,
      setUser,
      authUser,
      completeOnboarding,
      account,
      accountsAvailable,
      createAccount,
      logIn,
      logOut,
      favorites,
      membershipAlert,
    }),
    [
      user,
      setUser,
      authUser,
      completeOnboarding,
      account,
      createAccount,
      logIn,
      logOut,
      favorites,
      membershipAlert,
    ],
  );

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={GlobalStyle.loadingScreen}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <UserContext.Provider value={userContext}>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => setNavigationReady(true)}
        >
          <RootStack.Navigator screenOptions={stackHeader}>
            {showOnboarding ? onboardingScreens() : appScreens()}
          </RootStack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </UserContext.Provider>
    </SafeAreaProvider>
  );
}
