import { createContext } from 'react';

// App-dækkende brugerdata, som App.js stiller til rådighed for alle skærme:
// { user, setUser, authUser, completeOnboarding } og til Konto
// { account, accountsAvailable, createAccount, logIn, logOut } og brugerens Favoritter
// { favorites } (se useFavorites i services/Favorites.js).
// Skærme læser den med useContext(UserContext).
export const UserContext = createContext(null);
