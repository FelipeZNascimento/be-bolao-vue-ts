/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
export function singleton<T extends new (...args: any[]) => object>(constructor: T) {
  const instances = new WeakMap<T, InstanceType<T>>();

  return class extends (constructor as any) {
    constructor(...args: any[]) {
      super(...args);
      if (!instances.has(constructor)) {
        instances.set(constructor, this as InstanceType<T>);
      }
      const inst = instances.get(constructor);
      if (!inst) {
        throw new Error('Singleton instance missing');
      }
      return inst;
    }
  } as unknown as T;
}
/* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
