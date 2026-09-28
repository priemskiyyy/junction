import type { FolioJunction } from "example-shared/junction/types/FolioJunction";

// Declaration merging needs an interface: this is how the binding's hooks learn Folio's Junction.
declare module "@priemskiyyy/junction-react" {
  interface Register {
    junction: FolioJunction;
  }
}
