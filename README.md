# InstantiationService

`InstantiationService` 是一个`依赖注入（Dependency Injection）`容器，用于`管理类的实例化过程`，通过该类可以方便地实例化其他对象并将他们注册为服务，以便于提供给其他模块使用。

如果想要阅读VSCode源码，那么`InstantiationService` 是源码中一个绕不开的，非常重要的一个组件，能够有效提高服务的复用性、灵活性和易用性，同时也为插件开发者提供了强大的扩展能力和API支持。

本文尝试通过阅读这一部分源码，梳理 `InstantiationService` 的实现原理，以便后续阅读VSCode源码打下基础。




