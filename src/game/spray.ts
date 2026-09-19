// OWNER: P1. Shared mutable flag for the water gun, written by the view model
// and read by the obstacle hit test.
//
// A plain object for the same reason `runner` is one: this is touched every
// frame by two systems inside the Canvas, and routing it through the zustand
// store would mean a set() per frame.
export const spray = {
  /** True while the trigger is held. */
  active: false,
};

/** Metres ahead of the runner the jet can reach. */
export const SOAK_RANGE = 22;
/** Lateral tolerance in metres -- the jet is a cone, not a laser. */
export const SOAK_WIDTH = 3.4;
