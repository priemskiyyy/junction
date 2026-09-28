export class Clock {
  #read: () => number;
  #wall: number | null = null;
  #time = Number.NEGATIVE_INFINITY;

  constructor(read: () => number = Date.now) {
    this.#read = read;
  }

  // Only the wall clock's forward steps count: set back, it neither runs the time backwards, which would grow a remaining lifetime, nor holds it still, which would stop every deadline.
  now = () => {
    const wall = this.#read();
    const previous = this.#wall;

    this.#wall = wall;

    if (previous === null) {
      this.#time = Math.max(this.#time, wall);

      return this.#time;
    }

    if (wall > previous) {
      this.#time += wall - previous;
    }

    return this.#time;
  };

  // A restored Junction's clock starts at its snapshot's, so a wall clock set back since then extends no deadline.
  advance = (time: number) => {
    if (time > this.#time) {
      this.#time = time;
    }
  };
}
