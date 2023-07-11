## VSCode-InstantiationService源码分析

在VSCode架构中 `InstantiationService` 扮演着重要角色：

1. 依赖注入容器：`InstantiationService`充当了一个依赖注入容器，管理着VSCode中的各种服务和组件之间的依赖关系。它通过提供服务的注册和解析机制，使得不同的组件能够以松耦合的方式协同工作。
2. 服务实例化：`InstantiationService`负责实例化各种服务，并确保它们的依赖关系得到满足。它通过使用`ServiceCollection`作为注册表，记录服务的类型和实现类之间的映射关系。当需要获取某个服务实例时，`InstantiationService`会根据注册表中的信息，实例化并返回相应的服务对象。
3. 解决依赖关系：`InstantiationService`能够自动解析和处理服务之间的依赖关系。当一个服务依赖于其他服务时，`InstantiationService`会自动递归地实例化并满足所有的依赖关系，确保每个服务都能获取到它所需要的依赖项。
4. 插件系统支持：`InstantiationService`为`VSCode`的插件系统提供了强大的支持。插件可以通过`InstantiationService`获取所需的服务，并在运行时动态注册和注销服务。这为插件的开发和扩展提供了便利和灵活性。

如果想阅读VSCode源码的话，`InstantiationService` 是不得不先去了解的模块，它是各种服务之间的桥，理解了它，才能更好的把握各种服务之间的关系。



Tip: 为了方便调试和阅读代码，我将VSCode中`InstantiationService`的源码部分，单独提取出来，放在了[仓库](https://github.com/jinchaofs/VSCode-Source-Learning)里。

### ServiceCollection

在`InstantiationService`中，`ServiceCollection`用于存储服务的注册信息。它是一个简单的键值对集合，其中键是`服务的标识符`，值可以是`实例对象` 或`SyncDescriptor`描述符。

```typescript
import { ServiceIdentifier } from './instantiation';
import { SyncDescriptor } from './descriptor';

export class ServiceCollection {

    private _entries = new Map<ServiceIdentifier<any>, any>();

    constructor(..._entries: [ServiceIdentifier<any>, any][]) {
        for (const [id, service] of _entries) {
            this.set(id, service);
        }
    }

    set<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>): T | SyncDescriptor<T> {
        const result = this._entries.get(id);
        this._entries.set(id, instanceOrDescriptor);
        return result;
    }

    has(id: ServiceIdentifier<any>): boolean {
        return this._entries.has(id);
    }

    get<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
        return this._entries.get(id);
    }

    print() {
        console.log("Collections", this._entries.keys());
        console.log(JSON.stringify(this._entries));
    }
}
```

`ServiceCollection`提供了一组简单的方法，用于添加、获取和检查服务的注册信息。

### ServiceIdentifier

`ServiceIdentifier` 是一个函数类型，用于表示 `服务的标识符`

同时它也是一个装饰器，用于装饰对象的构造函数的服务参数

在 `InstantiationService`  中扮演着索引依赖的重要角色，就像它的函数名称是 `id` 一样，主要用于与建立与注册的服务实例的依赖关系

```typescript
export interface ServiceIdentifier<T> {
    (...args: any[]): void;
    type: T;
}
export namespace _util {
    export const serviceIds = new Map<string, ServiceIdentifier<any>>();

    export const DI_TARGET = "$di$target";
    export const DI_DEPENDENCIES = '$di$dependencies';

    export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>; index: number }[] {
        return ctor[DI_DEPENDENCIES] || [];
    }
}
export function createDecorator<T>(serviceId: string): ServiceIdentifier<T> {
    if (_util.serviceIds.has(serviceId)) {
        return _util.serviceIds.get(serviceId)!;
    }
    const id = <any>function (target: Function, key: string, index: number): any {
        if (arguments.length !== 3) {
            throw new Error("@IServiceName-decorator can only be used to decorate a parameter'")
        }
        storeServiceDependency(id, target, index);
    }
    id.toString = () => serviceId;
    _util.serviceIds.set(serviceId, id);
    return id;
}
```



### SyncDescriptor

`SyncDescriptor` 服务描述器，用于指定服务的类型和具体实现类。

```typescript
type Ctor<T> = new (...args: any[]) => T;

export class SyncDescriptor<T> {
    readonly ctor: Ctor<T>;
    readonly staticArguments: any[];
    readonly supportsDelayedInstantiation: boolean;

    constructor(ctor: Ctor<T>, staticArguments: any[] = [], supportsDelayedInstantiation: boolean = false) {
        this.ctor = ctor;
        this.staticArguments = staticArguments;
        this.supportsDelayedInstantiation = supportsDelayedInstantiation;
    }
}
```

`SyncDescriptor`提供了构造函数、静态参数和延迟实例化支持的能力。

它通过构造函数的方式将服务的实现类与依赖关系绑定在一起。

它带来的一个好处是，对于需要注入的服务，无需在外部实例化，只需要使用`SyncDescriptor`对服务对象进行描述，即可。



### 实例化和依赖注入

在`InstantiationService`类具有两种实例化对象并实现依赖注入的方式：`注入服务实例` 、`注入服务描述器(SyncDescriptor)`



#### 注入服务实例

需要被注入的服务`Service1` 、`Service2`和`Service3`，都是提前初始化为`服务实例`，而后添加到服务集合中，以供`InstantiationService`可以通过`服务标识符`进行索引服务实例，进行依赖注入。

```typescript
class TargetWithStaticParam {
    constructor(v: boolean, @IService1 service1: IService1) {
        assert.ok(v);
        assert.ok(service1);
        assert.strictEqual(service1.c, 1);
    }
}

const collection = new ServiceCollection();
const service = new InstantiationService(collection);
collection.set(IService1, new Service1());
collection.set(IService2, new Service2());
collection.set(IService3, new Service3());

service.createInstance(TargetWithStaticParam, true);
```

**实例化实现部分部分**

1. 通过`服务标识符`，在`服务集合`中获取`服务实例`
2. 处理构造函数中的静态参数和注入的服务参数，初始化对象

```typescript
private _createInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {

	// arguments defined by service decorators
	const serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
	// 构造函数的依赖注入服务列表
	const serviceArgs: any[] = [];
	for (const dependency of serviceDependencies) {
	// 通过服务标识符获取服务实例
		const service = this._getOrCreateServiceInstance(dependency.id, _trace);
		if (!service) {
			this._throwIfStrict(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`, false);
		}
		serviceArgs.push(service);
	}
	
	const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;
	
	// 正常来说，构造函数中注入的服务对象实例，总是在静态参数的后面排布，比如：constructor(val1, val2, @IService1 val3: IService1)
	// 我们将 val1 和 val2 称为静态参数 
	// 如果创建实例时，第一个注入服务下标跟传入的静态参数长度不一致，则需要调整
	if (args.length !== firstServiceArgPos) {
		const delta = firstServiceArgPos - args.length;
		if (delta > 0) { // 如果传入的参数少于构造函数的静态参数，中间缺失的参数，用空补充
			args = args.concat(new Array(delta));
		} else { // 如果传入的参数多于构造函数的静态参数，则删除位置为firstServiceArgPos极其之后的参数
			args = args.slice(0, firstServiceArgPos);
		}
	}
	
	// 根据构造函数和参数，创建对象实例
	return Reflect.construct<any, T>(ctor, args.concat(serviceArgs));
}
```

`注入服务实例 `的特点是：需要使用者提前实例化需要注入的服务。



#### 注入服务描述器（SyncDescriptor）

与`注入服务实例`不同的是，实例化对象时，可以选择传入服务描述器。

这种方式，需要注入的服务对象，无需被手动实例化，`InstantiationService` 内部会根据注入的服务描述器，进行实例化。

```typescript
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
```

**实例化实现部分**

1. 构建注入服务的依赖关系图（graph）
2. 遍历依赖关系图，根据服务描述器，创建服务实例，并存储到 `_services: ServiceCollection` 中

遍历依赖关系图，是以广度优先方式，优先找到依赖关系图中的根节点（最远节点，也即最外层的服务对象）

```
Service21Impl
├── Service2Impl
└── Service1Impl
		└── InstantiationService
```

例子中，`Service21Impl`关系图中最外层根节点则是`Service2` 和 `InstantiationService`。

```typescript
/**
* 通过执行invokeFunction，可以得到访问依赖注入的服务句柄，如accessor.get(xx)
* @param fn 
* @param args 
* @returns 
*/
invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R {
  const _trace = Trace.traceInvocation(this._enableTracing, fn);
  let _done = false; // 执行完成标记，回调函数一旦结束，accessor不允许再被访问
  try {
    const accessor: ServicesAccessor = {
      get: <T>(id: ServiceIdentifier<T>) => {

        if (_done) {
          throw new Error('service accessor is only valid during the invocation of its target method');
        }

        const result = this._getOrCreateServiceInstance(id, _trace);
        if (!result) {
          throw new Error(`[invokeFunction] unknown service '${id}'`);
        }
        return result;
      }
    };
    return fn(accessor, ...args);
  } finally {
    _done = true;
    _trace.stop();
  }
}
/**
* 创建服务实例，并缓存到服务实例集合中
*/
private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, _trace: Trace): T {

		type Triple = { id: ServiceIdentifier<any>; desc: SyncDescriptor<any>; _trace: Trace };
		const graph = new Graph<Triple>(data => data.id.toString());

		let cycleCount = 0;
		const stack = [{ id, desc, _trace }];
		/**
		 * 深度优先遍历，构建服务的SyncDescriptor依赖关系图
		 * 由于SyncDescriptor只是类的描述符，不是实例，所以根根据关系图，在需要时，递归创建依赖关系图中所有的服务实例据
		 */
		while (stack.length) {
			// 从当前服务节点开始
			const item = stack.pop()!;
			// 如果不存在，则插入图中
			graph.lookupOrInsertNode(item);

			if (cycleCount++ > 1000) {
        // 检测到循环依赖关系，抛出异常
				throw new CyclicDependencyError(graph);
			}

			// 检查所有的依赖项是否存在，确定是否需要先创建他们 
			for (const dependency of _util.getServiceDependencies(item.desc.ctor)) {
				// 在服务集合（_services）中获取实例（service instance）或者描述对象(service SyncDescriptor)
				const instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
				if (!instanceOrDesc) {
					this._throwIfStrict(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`, true);
				}

				// 记录服务之间的依赖关系
				this._globalGraph?.insertEdge(String(item.id), String(dependency.id));
				// 如果对象是描述对象，则将节点插入的图中，并入栈，进行深度查找
				if (instanceOrDesc instanceof SyncDescriptor) {
					const d = { id: dependency.id, desc: instanceOrDesc, _trace: item._trace.branch(dependency.id, true) };
					graph.insertEdge(item, d);
					stack.push(d);
				}
			}
		}

		while (true) {
			/**
			 * 广度优先遍历
			 * 递归遍历根节点，由外向内的对关系图中的描述符，创建实例对象
			 */
			const roots = graph.roots();
			if (roots.length === 0) {
				if (!graph.isEmpty()) {
          // 没有根节点但图中仍然存在节点，说明存在循环依赖关系，抛出异常
					throw new CyclicDependencyError(graph);
				}
				break;
			}

			for (const { data } of roots) {
				// 检查服务的SyncDescriptor是否存在，并可能触发递归实例化
				const instanceOrDesc = this._getServiceInstanceOrDescriptor(data.id);
				if (instanceOrDesc instanceof SyncDescriptor) {
					 // 创建实例并覆盖服务集合中的实例
					const instance = this._createServiceInstanceWithOwner(data.id, data.desc.ctor, data.desc.staticArguments, data.desc.supportsDelayedInstantiation, data._trace);
					this._setServiceInstance(data.id, instance);
				}
				// 创建完成后，移出根节点，进入下一次查找
				graph.removeNode(data);
			}
		}
		return <T>this._getServiceInstanceOrDescriptor(id);
	}

private _createServiceInstance<T>(id: ServiceIdentifier<T>, ctor: any, args: any[] = [], supportsDelayedInstantiation: boolean, _trace: Trace): T {
    if (!supportsDelayedInstantiation) {
        // 如果不支持延迟实例化，则立即创建实例
        return this._createInstance(ctor, args, _trace);
    } else {
        const child = new InstantiationService(undefined, this._strict, this, this._enableTracing);
        child._globalGraphImplicitDependency = String(id);

        // 创建一个由空闲值支持的代理对象。
        // 这个策略是在空闲时间或实际需要时实例化服务，而不是在注入到消费者时实例化。
        // 当服务尚未实例化时，返回"空事件"。
        const earlyListeners = new Map<string, LinkedList<Parameters<Event<any>>>>();

        const idle = new IdleValue<any>(() => {
            const result = child._createInstance<T>(ctor, args, _trace);

            // 将之前保存的早期监听器订阅到实际的服务上
            for (const [key, values] of earlyListeners) {
                const candidate = <Event<any>>(<any>result)[key];
                if (typeof candidate === 'function') {
                    for (const listener of values) {
                        candidate.apply(result, listener);
                    }
                }
            }
            earlyListeners.clear();

            return result;
        });

        // 创建一个代理对象，它由空闲值支持
        return <T>new Proxy(Object.create(null), {
            get(target: any, key: PropertyKey): any {
                if (!idle.isInitialized) {
                    // 判断是否为事件的访问
                    if (typeof key === 'string' && (key.startsWith('onDid') || key.startsWith('onWill'))) {
                        let list = earlyListeners.get(key);
                        if (!list) {
                            list = new LinkedList();
                            earlyListeners.set(key, list);
                        }
                        // 返回一个事件函数，当事件触发时会将监听器加入到队列中
                        const event: Event<any> = (callback, thisArg, disposables) => {
                            const rm = list!.push([callback, thisArg, disposables]);
                            return toDisposable(rm);
                        };
                        return event;
                    }
                }

                // 判断值是否已存在
                if (key in target) {
                    return target[key];
                }

                // 创建值
                const obj = idle.value;
                let prop = obj[key];
                if (typeof prop !== 'function') {
                    return prop;
                }
                prop = prop.bind(obj);
                target[key] = prop;
                return prop;
            },
            set(_target: T, p: PropertyKey, value: any): boolean {
                // 设置值
                idle.value[p] = value;
                return true;
            },
            getPrototypeOf(_target: T) {
                return ctor.prototype;
            }
        });
    }
}
```

