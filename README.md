# InstantiationService 实例初始化服务

阅读VSCode源码是学习和理解该开源项目的一种方式。

在源码中，有一个非常重要且无法绕过的模块，那就是`InstantiationService`。

它是一个依赖注入容器，用于管理类的实例化过程，并提供灵活、易用的服务注册和获取机制。

对于插件开发者来说，它还提供了强大的扩展能力和API支持。

本文将通过阅读`InstantiationService`的源码，解析其实现原理，以便为后续阅读VSCode源码做好铺垫。

## 依赖注入

在开始分析`InstantiationService`之前，让我们回顾一下依赖注入设计模式的概念和优势。

依赖注入是一种设计模式，帮助我们实现松耦合的组件和可测试的代码。

在依赖注入中，对象不需要自己创建或获取它所依赖的其他对象，而是通过外部注入的方式来提供这些依赖关系。这样可以提高代码的可维护性、可测试性和可扩展性。

举个例子，我们先看一个传统的处理类依赖关系的方式：

```typescript
class Logger {
  log(message: string) {
    console.log(message);
  }
}

class UserService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    // 具体的创建用户逻辑
  }
}
```

上述代码中，每个类都需要负责创建它所依赖的`Logger`对象。这样的实现方式导致了类之间的紧耦合关系，同时在测试时很难替换或模拟日志记录功能。

通过使用依赖注入，我们可以改进上述代码：

```typescript
class UserService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
  }
}

const logger = new Logger();
const userService = new UserService(logger);
userService.createUser("Tester");
```

在这个示例中，我们将`Logger`对象作为参数传递给`UserService`类的构造函数，实现了依赖注入。这样就可以在创建`UserService`实例时传入不同的`Logger`对象，实现对日志记录功能的定制或模拟。

通过依赖注入，我们实现了类之间的解耦，并提高了代码的可测试性和可扩展性。特别是在大型应用程序中，依赖注入可以更轻松地管理和替换依赖关系。

## `Instantiation`中的装饰器

`InstantiationService`中依赖的装饰器的关键源码位于`instantiation/instantiation.ts`文件中。

首先，我们来看一下`createDecorator`函数的实现，该函数用于创建装饰器，作为服务（类）的唯一标识符。

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

function storeServiceDependency(id: Function, target: Function, index: number): void {
    if ((target as any)[_util.DI_TARGET] === target) {
        (target as any)[_util.DI_DEPENDENCIES].push({ id, index });
    } else {
        (target as any)[_util.DI_DEPENDENCIES] = [{ id, index }];
        (target as any)[_util.DI_TARGET] = target;
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

上述代码中，我们主要关注以下几个部分：

1. `createDecorator`函数用于创建装饰器，返回一个服务标识符的函数（装饰器）。

2. 装饰器展开：装饰器函数（服务标识符函数）被调用时，会将`{ id, index }`存储在`target[_util.DI_DEPENDENCIES]`列表中。

   - `id`是装饰器函数本身，也就是服务标识符（具体引用后面会提到）。

   - `index`是装饰器装饰的参数在参数列表中的位置。例如，在下面的示例中，`IService2`是使用`createDecorator`创建的服务标识符，它装饰了`Target2Dep`类构造函数中的第二个参数`@IService2 service2: IService2`，那么`index`的值就是`1`。

     ```typescript
     const IService2 = createDecorator<IService2>('service2');
     
     interface IService2 {
         readonly _serviceBrand: undefined;
         d: boolean;
     }
     
     class Target2Dep {
         constructor(@IService1 service1: IService1, @IService2 service2: IService2) {
             assert.ok(service1 instanceof Service1);
             assert.ok(service2 instanceof Service2);
         }
     }
     ```

     `target`表示装饰器所在的构造函数对象，在上述示例中即为`Target2Dep`。

     `target[_util.DI_DEPENDENCIES]`即`Target2Dep["$di$dependencies"]`，存储了构造函数中所有装饰器的标识符（`id`）和它们在参数列表中的位置（`index`）。

这里我们结合测试用例中的示例进行分析实际应用：

```ts
// 接口
interface IService1 {
    readonly _serviceBrand: undefined;
    c: number;
}
// 服务标识符/装饰器，类型是：ServiceIdentifier<IService1>
const IService1 = createDecorator<IService1>('service1');

interface IDependentService {
    readonly _serviceBrand: undefined;
    name: string;
}
class DependentService implements IDependentService {
    declare readonly _serviceBrand: undefined;
    name = 'farboo';
		// 使用服务标识符装饰参数
    constructor(@IService1 service: IService1) {
        assert.strictEqual(service.c, 1);
    }
}
```

当装饰器展开后，对象会新增两个属性`$di$dependencies`（依赖列表，包含依赖对象的服务标识符）和`$di$target`（对象自身），通过断点调试如下图：

![didependencies](./assets/images/image-20230627152920108.png)

现在我们已经了解了`createDecorator`的目的，即以装饰器的形式收集和存储对象的依赖关系。接下来，我们将继续分析`InstantiationService`中的代码，以了解如何创建对象实例并实现依赖注入。

### 



