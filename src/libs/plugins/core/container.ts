type ServiceFactory<T> = () => T;

class Container {
	private services = new Map<string, ServiceFactory<unknown>>();
	private instances = new Map<string, unknown>();

	register<T>(name: string, factory: ServiceFactory<T>): void {
		this.services.set(name, factory);
	}

	resolve<T>(name: string): T {
		if (this.instances.has(name)) {
			return this.instances.get(name) as T;
		}

		const factory = this.services.get(name);
		if (!factory) {
			throw new Error(`Service ${name} not registered`);
		}

		const instance = factory() as T;
		this.instances.set(name, instance);
		return instance;
	}

	reset(): void {
		this.instances.clear();
	}

	clearAll(): void {
		this.services.clear();
		this.instances.clear();
	}
}

export const container = new Container();
