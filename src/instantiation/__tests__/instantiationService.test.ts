import * as assert from 'assert';
import { IInstantiationService, ServicesAccessor, createDecorator } from "../instantiation";
import { ServiceCollection } from '../serviceCollection';
import { InstantiationService } from '../instantiationService';
import { SyncDescriptor } from '../descriptor';

const IService1 = createDecorator<IService1>('service1');

interface IService1 {
    readonly _serviceBrand: undefined;
    c: number;
}

class Service1 implements IService1 {
    declare readonly _serviceBrand: undefined;
    c = 1;
}

const IService2 = createDecorator<IService2>('service2');

interface IService2 {
    readonly _serviceBrand: undefined;
    d: boolean;
}

class Service2 implements IService2 {
    declare readonly _serviceBrand: undefined;
    d = true;
}

const IService3 = createDecorator<IService3>('service3');
interface IService3 {
    readonly _serviceBrand: undefined;
    s: string;
}
class Service3 implements IService3 {
    declare readonly _serviceBrand: undefined;
    s = 'farboo';
}

const IDependentService = createDecorator<IDependentService>('dependentService');
interface IDependentService {
    readonly _serviceBrand: undefined;
    name: string;
}
class DependentService implements IDependentService {
    declare readonly _serviceBrand: undefined;
    name = 'farboo';
    constructor(@IService1 service: IService1) {
        assert.strictEqual(service.c, 1);
    }
}

class Service1Consumer {

    constructor(@IService1 service1: IService1) {
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
}

class Target2Dep {

    constructor(@IService1 service1: IService1, @IService2 service2: IService2) {
        assert.ok(service1 instanceof Service1);
        assert.ok(service2 instanceof Service2);
    }
}

class TargetWithStaticParam {

    constructor(v: boolean, @IService1 service1: IService1) {
        assert.ok(v);
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
}

class DependentServiceTarget {
    _d: IDependentService;
    constructor(@IDependentService d: IDependentService) {
        this._d = d;
        assert.ok(d);
        assert.strictEqual(d.name, 'farboo');
    }
    updateName(name: string) {
        this._d.name = name;
    }
}

class DependentServiceTarget2 {
    constructor(@IDependentService d: IDependentService, @IService1 s: IService1) {
        assert.ok(d);
        assert.strictEqual(d.name, 'farboo');
        assert.ok(s);
        assert.strictEqual(s.c, 1);
    }
}

class ServiceLoop1 implements IService1 {
    declare readonly _serviceBrand: undefined;
    c = 1;

    constructor(@IService2 s: IService2) {

    }
}

class ServiceLoop2 implements IService2 {
    declare readonly _serviceBrand: undefined;
    d = true;
    constructor(@IService1 s: IService1) { }
}
/**
 * 
 */
describe("Instantiation Service", () => {
    test("service collection, cannot overwrite", () => {
        const collection = new ServiceCollection();
        let result = collection.set(IService1, null!);
        expect(result).toStrictEqual(undefined);
        result = collection.set(IService1, new Service1());
        expect(result).toStrictEqual(null);
    })

    test('service collection, add/has', () => {
        const collection = new ServiceCollection();
        collection.set(IService1, null!);
        expect(collection.has(IService1)).toBeTruthy();

        collection.set(IService2, null!);
        expect(collection.has(IService1)).toBeTruthy();
        expect(collection.has(IService2)).toBeTruthy();
    })

    test('@Param - simple class', () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        collection.set(IService3, new Service3());

        service.createInstance(Service1Consumer);
        console.log("")
    })

    test('@Param - fixed args', () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());
        collection.set(IService3, new Service3());

        service.createInstance(TargetWithStaticParam, true);
    })

    test("service collection is live", () => {
        const collection = new ServiceCollection();
        collection.set(IService1, new Service1());

        const service = new InstantiationService(collection);
        service.createInstance(Service1Consumer);

        collection.set(IService2, new Service2());
        service.createInstance(Target2Dep);

        service.invokeFunction((a) => {
            expect(a.get(IService1).c).toStrictEqual(1);
            expect(a.get(IService2).d).toStrictEqual(true);
        })
    })

    test("SyncDesc - no dependencies", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor<IService1>(Service1));

        service.invokeFunction(accessor => {
            const service1 = accessor.get(IService1);
            assert.ok(service1);
            assert.strictEqual(service1.c, 1);

            const service2 = accessor.get(IService1);
            assert.ok(service1 === service2);
        })
    })

    test("SyncDesc - service with service dependency", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor<IService1>(Service1));
        collection.set(IDependentService, new SyncDescriptor<IDependentService>(DependentService));

        service.invokeFunction(accessor => {
            const d = accessor.get(IDependentService);
            assert.ok(d);
            assert.strictEqual(d.name, 'farboo');
        })
    })


    test("SyncDesc - target depends on service future", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor<IService1>(Service1));
        collection.set(IDependentService, new SyncDescriptor<IDependentService>(DependentService));

        const d = service.createInstance(DependentServiceTarget);
        assert.ok(d instanceof DependentServiceTarget);


        /**
         * DependentServiceTarget2 依赖了 DependentServiceTarget 和 Service1
         * 但是由于前面初始化实例 DependentServiceTarget 的时候已经进行了依赖关系的深层实例化
         * 后面实例化DependentServiceTarget2的时候进行了复用
         */
        /**
         * 同时也说明，同一个InstantiationService创建的实例，存在相同依赖对象时，依赖的是同一个实例
         */
        const d2 = service.createInstance(DependentServiceTarget2);
        assert.ok(d2 instanceof DependentServiceTarget2);
    })

    test("SyncDesc - explode on loop", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new SyncDescriptor<IService1>(ServiceLoop1));
        collection.set(IService2, new SyncDescriptor<IService2>(ServiceLoop2));

        assert.throws(() => {
            service.invokeFunction(accessor => {
                accessor.get(IService1);
            })
        })
        assert.throws(() => {
            service.invokeFunction(accessor => {
                accessor.get(IService2);
            })
        })
        try {
            service.invokeFunction(accessor => {
                accessor.get(IService1);
            })
        } catch (error: any) {
            assert.ok(error.name);
            assert.ok(error.message);

        }
    })

    test("Invoke - get services", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());

        function test(accessor: ServicesAccessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.strictEqual(accessor.get(IService1).c, 1);
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
    })

    test("Invoke - get service, optional", () => {
        const collection = new ServiceCollection([IService1, new Service1()]);
        const service = new InstantiationService(collection);

        function test(accessor: ServicesAccessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.throws(() => accessor.get(IService2));
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);
    })

    test("Invoke - keeping accessor NOT allowed", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());

        let cached: ServicesAccessor;

        function test(accessor: ServicesAccessor) {
            assert.ok(accessor.get(IService1) instanceof Service1);
            assert.strictEqual(accessor.get(IService1).c, 1);
            cached = accessor;
            return true;
        }
        assert.strictEqual(service.invokeFunction(test), true);

        assert.throws(() => cached.get(IService2));
    })

    test("Invoke - throw error", () => {
        const collection = new ServiceCollection();
        const service = new InstantiationService(collection);
        collection.set(IService1, new Service1());
        collection.set(IService2, new Service2());

        function test(accessor: ServicesAccessor) {
            throw new Error();
        }

        assert.throws(() => service.invokeFunction(test));
    })

    test('Create child', () => {
        let serviceInstanceCount = 0;
        const CtorCounter = class implements Service1 {
            declare readonly _serviceBrand: undefined;
            c = 1;
            constructor() {
                serviceInstanceCount += 1;
            }
        }

        let service = new InstantiationService(new ServiceCollection([IService1, new SyncDescriptor(CtorCounter)]));
        service.createInstance(Service1Consumer);

        let child = service.createChild(new ServiceCollection([IService2, new Service2()]));
        child.createInstance(Service1Consumer);
        assert.strictEqual(serviceInstanceCount, 1);

        serviceInstanceCount = 0;
        service = new InstantiationService(new ServiceCollection([IService1, new SyncDescriptor(CtorCounter)]));
        child = service.createChild(new ServiceCollection([IService2, new Service2()]));

        service.createInstance(Service1Consumer);
        child.createInstance(Service1Consumer);
        assert.strictEqual(serviceInstanceCount, 1);
    })

    test("Remote window / integration tests is broken", () => {
        const Service1 = createDecorator<any>('service1');
        class Service1Impl {
            constructor(@IInstantiationService instant: IInstantiationService) {
                const c = instant.invokeFunction(accessor => accessor.get(Service2))
                assert.ok(c);
            }
        }
        const Service2 = createDecorator<any>("service2");
        class Service2Impl {
            constructor() { }
        }
        const Service21 = createDecorator<any>('service21');
        class Service21Impl {
            constructor(@Service2 public readonly service2: Service2Impl, @Service1 public readonly service1: Service1Impl) { }
        }
        const instant = new InstantiationService(new ServiceCollection(
            [Service1, new SyncDescriptor(Service1Impl)],
            [Service2, new SyncDescriptor(Service2Impl)],
            [Service21, new SyncDescriptor(Service21Impl)]
        ))
        const obj = instant.invokeFunction(accessor => accessor.get(Service21));
        assert.ok(obj);
    })

    test('Sync/Async dependency loop', async () => {
        const A = createDecorator<A>('A');
        const B = createDecorator<B>('B');
        interface A { _serviceBrand: undefined; doIt(): void }
        interface B { _serviceBrand: undefined; b(): boolean }

        class BConsumer {
            constructor(@B private readonly b: B) { }
            doIt() {
                return this.b.b();
            }
        }

        class AService implements A {
            _serviceBrand: undefined;
            prop: BConsumer;
            constructor(@IInstantiationService instant: IInstantiationService) {
                this.prop = instant.createInstance(BConsumer);
            }
            doIt() {
                return this.prop.doIt();
            }
        }

        class BService implements B {
            _serviceBrand: undefined;
            b(): boolean {
                return true;
            }
            constructor(@A a: A) {
                assert.ok(a);
            }
        }

        {
            const instant1 = new InstantiationService(new ServiceCollection(
                [A, new SyncDescriptor(AService)],
                [B, new SyncDescriptor(BService)]
            ), true, undefined, true);

            try {
                instant1.invokeFunction(accessor => accessor.get(A));
                assert.ok(false);
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes("RECURSIVELY"));
            }
        }
        {
            const instant2 = new InstantiationService(new ServiceCollection(
                [A, new SyncDescriptor(AService, undefined, true)],
                [B, new SyncDescriptor(BService, undefined)]
            ), true, undefined, true);

            const a = instant2.invokeFunction(accessor => accessor.get(A));
            a.doIt();

            const cycle = instant2._globalGraph?.findCycleSlow();
            assert.strictEqual(cycle, 'A -> B -> A');
        }
    })
})