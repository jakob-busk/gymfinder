import { createContext } from 'react';

// App-dækkende brugerdata, som App.js stiller til rådighed for alle skærme:
// { user, setUser, authUser }. Skærme læser den med useContext(UserContext).
export const UserContext = createContext(null);
