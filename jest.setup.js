// jest-expo slår native mocks op via stack traces. Ligger projektet i en mappe med
// parenteser i stien (fx "Obsidian (Privat)"), fejler opslaget, når Expo's dovne
// global `fetch` bliver læst. Vi sætter `fetch` direkte, så opslaget aldrig sker.
// Testene bruger ikke netværk.
Object.defineProperty(globalThis, 'fetch', { value: undefined, configurable: true, writable: true });
