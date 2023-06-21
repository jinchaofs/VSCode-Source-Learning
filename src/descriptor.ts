/**
 * 描述类
 */

type Ctor<T> = new (...args: any[]) => T 
/**
 * 用于指定服务的类型和具体实现类，以便在依赖注入中注册和解析服务时提供更多的控制和灵活性。
 */
export class SyncDescriptor<T> {
    // 构造函数
    readonly ctor: Ctor<T>;
    readonly staticArguments: any[];
    // 是否支持延迟实例化
    readonly supportsDelayedInstantiation: boolean;

    constructor(ctor: Ctor<T>, staticArguments: any[] = [], supportsDelayedInstantiation: boolean = false) {
        this.ctor = ctor;
        this.staticArguments = staticArguments;
        this.supportsDelayedInstantiation = supportsDelayedInstantiation;
    }
}

export interface SyncDescriptor0<T> {
    readonly ctor: new () => T;
}