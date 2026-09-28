import type { createJunction } from "src/hooks/junction.fixture";

// The binding's own tests use it as an application does: registered with the Junction they render.
declare module "src/types/Register" {
  interface Register {
    junction: ReturnType<typeof createJunction>["junction"];
  }
}
