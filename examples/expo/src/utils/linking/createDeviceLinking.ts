import * as Linking from "expo-linking";

import type { RealLinking } from "example-shared/device/types/RealLinking";

const FOLIO_SCHEME = "folio://";

const EXPO_PATH = "/--/";

// Expo Go opens a project's links as exp://<host>/--/<path>, under its own scheme, so Junction is handed Folio's form of them.
const getFolioUrl = (url: string) => {
  const path = url.indexOf(EXPO_PATH);

  if (!url.startsWith("exp") || path === -1) {
    return url;
  }

  return `${FOLIO_SCHEME}${url.slice(path + EXPO_PATH.length)}`;
};

/** This device's own Linking for the lab: links open as Linking.createURL() builds them, in Expo Go too, and reach Junction in Folio's form. */
export const createDeviceLinking = (): RealLinking => ({
  sdk: {
    addEventListener: (type, listener) =>
      Linking.addEventListener(type, ({ url }) =>
        listener({ url: getFolioUrl(url) }),
      ),
    getInitialURL: async () => {
      const url = await Linking.getInitialURL();

      if (url === null) {
        return null;
      }

      return getFolioUrl(url);
    },
  },
  open: (url) => {
    Linking.openURL(Linking.createURL(url.replace(FOLIO_SCHEME, ""))).catch(
      () => {},
    );
  },
});
