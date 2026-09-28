---
description: "A URL has one owner: Junction or your router. How to divide links between Junction and React Navigation or Expo Router, and how inspect() lets a router ask Junction what a URL means."
---

# Routers

A URL your app opens should have one owner. When both Junction and your router act on it, the same tap navigates twice, and whichever navigation lands last wins. Choose, per URL, who owns it.

## Junction owns the links

Choose this when a link may need to wait: for a screen to mount, a user to sign in, the right account, or a restart. Junction's consumers navigate, inside `commit`, and your router does not read the URL itself.

With React Navigation, give `NavigationContainer` no `linking`, or one whose `getInitialURL` and `subscribe` leave out the URLs Junction routes:

<!-- snippet: fragment -->

```tsx
import { NavigationContainer } from "@react-navigation/native";

const isJunctionUrl = (url: string) =>
  junction.inspect("links", { url }).status === "matched";

export const Root = () => (
  <NavigationContainer
    linking={{
      prefixes: ["myapp://", "https://app.example.com"],
      getInitialURL: async () => {
        const url = await Linking.getInitialURL();

        if (url === null || isJunctionUrl(url)) {
          return null;
        }

        return url;
      },
      subscribe: (listener) => {
        const subscription = Linking.addEventListener("url", ({ url }) => {
          if (!isJunctionUrl(url)) {
            listener(url);
          }
        });

        return () => subscription.remove();
      },
    }}
  >
    <Navigation />
  </NavigationContainer>
);
```

`inspect()` is pure: it admits nothing and calls no SDK, so asking it twice for one URL is safe.

## The router owns the links

Choose this when every link opens a screen at once and nothing needs to wait. Leave the Linking source out, or give it no URL routes, and let Junction take the entry points your router does not see: notification presses, home screen shortcuts and deferred links after an install.

Expo Router handles every URL the app opens. Its `+native-intent` file can rewrite a URL before navigation, and `inspect()` tells it what Junction's routes make of one, without dispatching anything:

```ts
export const redirectSystemPath = ({ path }: { path: string }) => {
  const inspection = junction.inspect("links", { url: path });

  if (
    inspection.status !== "matched" ||
    inspection.intent.name !== "openDocument"
  ) {
    return path;
  }

  return `/documents/${inspection.intent.payload.documentId}`;
};
```

## Deferred links

A provider such as Branch, AppsFlyer, Adjust or Detour resolves a link, a deferred one after an install included, and hands it to its SDK's callback. That callback has one owner too: give it to the source, and leave the provider's link domains out of your Linking routes and your router, so one link becomes one intent. Each source's page names the provider's own rules.
