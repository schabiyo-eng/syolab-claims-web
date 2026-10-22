export interface Clock {
  today(): string;
}

export function systemClock(): Clock {
  return {
    today() {
      return new Date().toISOString().slice(0, 10);
    },
  };
}

export function fixedClock(day: string): Clock {
  return {
    today() {
      return day;
    },
  };
}
