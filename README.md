# InstantiationService

如果想要阅读VSCode源码，那么`InstantiationService` 是源码中一个绕不开的，非常重要的一个组件，达到了随处可见的程度。

`InstantiationService` 是一个`依赖注入（Dependency Injection）`容器，用于`管理类的实例化过程`，通过该类可以方便地实例化其他对象并将他们注册为服务，以便于提供给其他模块使用。能够有效提高服务的复用性、灵活性和易用性，同时也为插件开发者提供了强大的扩展能力和API支持。

本文尝试通过阅读这一部分源码，梳理 `InstantiationService` 的实现原理，以便后续阅读VSCode源码做好铺垫。



## 依赖注入

在开始分析`InstantiationService`之前，有必要再回顾下 `依赖注入` 设计模式：

依赖注入是一种设计模式，帮助我们实现松耦合的组件和可测试的代码。

在依赖注入中，对象`不需要自己创建`或获取它所依赖的其他对象，而是通过`外部注入`的方式来提供这些依赖关系。这样可以提高代码的可维护性、可测试性和可扩展性。

举个例子：

传统方式处理类的依赖关系

```ts
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

这种方式存在的问题是，每个类都需要自己负责创建 `Logger` 对象，导致了类之间的紧耦合关系，并且在测试时难以替换或模拟日志记录功能。

通过使用依赖注入，我们可以改进上述代码：

```ts
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
// 使用依赖注入创建 UserService 实例
const userService = new UserService(logger);
userService.createUser("Tester");
```

示例中，将 `Logger` 对象作为参数传递给 `UserService` 类的构造函数，实现了依赖注入，后面讲到的`InstantiationService` 通过装饰器实现的依赖注入，跟示例原理是类似的。

这样就可以在创建 `UserService` 实例时传入不同的 `Logger` 对象，实现对日志记录功能的定制或模拟。

通过依赖注入，我们实现了类之间的解耦，并提高了代码的可测试性和可扩展性。

这种模式在大型应用程序中尤其有用，因为它允许我们更轻松地管理和替换依赖关系。



## InstantiationService 类初始化

