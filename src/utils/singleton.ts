export function singleton<T extends new (...args: any[]) => any>(constructor: T) {
  const instances = new WeakMap();

  return class extends constructor {
    constructor(...args: any[]) {
      if (!instances.has(constructor)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        super(...args);
        instances.set(constructor, this);
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return instances.get(constructor);
    }
  };
}
