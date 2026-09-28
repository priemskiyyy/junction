// react-native-appsflyer, as far as the documentation uses it: version 7's
// facade, typed by the js-core-plugin declarations it re-exports, and version
// 6's default export, as the 6.x source takes it.
import type { AppsFlyerSDK } from "@appsflyer-sdk/js-core-plugin";
import type { AppsFlyerLike } from "@priemskiyyy/junction-appsflyer-v6";

export declare const AppsFlyer: AppsFlyerSDK;

declare const appsFlyer: AppsFlyerLike & {
  initSdk: (options: {
    devKey: string;
    appId: string;
    onDeepLinkListener: boolean;
  }) => void;
};

export default appsFlyer;
