// Stand-ins for packages a reader installs that this workspace does not. A
// script file, not a module, so each block declares a module instead of
// augmenting one. Keep them to what the documentation uses.
declare module "@priemskiyyy/silo" {
  import type { SiloValueLike } from "@priemskiyyy/junction-silo";

  export type ValueDeclaration<TValue> = { kind: "value"; sample?: TValue };

  export const value: <TValue>() => ValueDeclaration<TValue>;

  export class Silo {
    constructor(options: {
      storages: Record<
        string,
        {
          adapters: unknown[];
          schema: Record<string, ValueDeclaration<unknown>>;
        }
      >;
    });

    value(key: string): SiloValueLike;
  }
}

declare module "@priemskiyyy/silo-mmkv" {
  export const mmkv: (options: { storage: unknown }) => unknown;
}

declare module "react-native-mmkv" {
  export class MMKV {
    constructor(options?: { id?: string });
  }
}
