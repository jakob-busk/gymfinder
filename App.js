import { useEffect, useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import CenterDetailScreen from './screens/CenterDetailScreen';
import FiltersScreen from './screens/FiltersScreen';
import { DEFAULT_USER } from './data/const';
import { UserContext } from './data/UserContext';
import { startAnonymousSession } from './services/Auth';
import { colors } from './styles/GlobalStyle';

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

// Profil-fanen er en stack, så Om os åbnes oven på Profil og fanebjælken bliver stående.
function ProfileTab() {
  return (
    <ProfileStack.Navigator screenOptions={stackHeader}>
      <ProfileStack.Screen
        name="ProfilForside"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen name="Om os" component={AboutScreen} />
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

// Appens navigation: fanerne nederst, og Centerdetalje og Filtre som stack oven på fanerne.
// Brugerdata deles med alle skærme via UserContext.
export default function App() {
  const [user, setUser] = useState(DEFAULT_USER);
  // Firebase-brugeren (anonym ved første opstart). null, hvis Firebase ikke er sat op.
  const [authUser, setAuthUser] = useState(null);

  useEffect(() => startAnonymousSession(setAuthUser), []);

  const userContext = useMemo(() => ({ user, setUser, authUser }), [user, authUser]);

  return (
    <SafeAreaProvider>
      <UserContext.Provider value={userContext}>
        <NavigationContainer>
          <RootStack.Navigator screenOptions={stackHeader}>
            <RootStack.Screen name="Faner" component={Tabs} options={{ headerShown: false }} />
            <RootStack.Screen
              name="CenterDetaljer"
              component={CenterDetailScreen}
              options={{ title: 'Center' }}
            />
            <RootStack.Screen name="Filtre" component={FiltersScreen} />
          </RootStack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </UserContext.Provider>
    </SafeAreaProvider>
  );
}
