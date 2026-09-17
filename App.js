import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import AboutScreen from './screens/AboutScreen';
import { DEFAULT_USER } from './data/const';
import { colors } from './styles/GlobalStyle';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(DEFAULT_USER);

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
        <Tab.Screen
          name="Dashboard"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        >
          {() => <DashboardScreen user={user} />}
        </Tab.Screen>
        <Tab.Screen
          name="Profil"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        >
          {() => <ProfileScreen user={user} setUser={setUser} />}
        </Tab.Screen>
        <Tab.Screen
          name="Om os"
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="information-circle" color={color} size={size} />,
          }}
        >
          {() => <AboutScreen />}
        </Tab.Screen>
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
