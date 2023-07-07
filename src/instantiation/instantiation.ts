import * as descriptors from "./descriptor";
import { ServiceCollection } from "./serviceCollection";

export interface ServiceIdentifier<T> {
    (...args: any[]): void;
    type: T;
}
// ------ util
/**
 * 1.将服务标识符存储在Map对象中
 * 2.提供获取对象的服务依赖项函数
 */
export namespace _util {
    export const serviceIds = new Map<string, ServiceIdentifier<any>>();

    export const DI_TARGET = "$di$target";
    export const DI_DEPENDENCIES = '$di$dependencies';

    export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>; index: number }[] {
        return ctor[DI_DEPENDENCIES] || [];
    }
}

// --- interfaces ------

export type BrandedService = { _serviceBrand: undefined };

export interface IConstructorSignature<T, Args extends any[] = []> {
    new <Services extends BrandedService[]>(...args: [...Args, ...Services]): T;
}

export interface ServicesAccessor {
    get<T>(id: ServiceIdentifier<T>): T;
}

export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService');

export type GetLeadingNonServiceArgs<TArgs extends any[]> =
    TArgs extends [] ? []
    : TArgs extends [...infer TFirst, BrandedService] ? GetLeadingNonServiceArgs<TFirst>
    : TArgs;

export interface IInstantiationService {

    readonly _serviceBrand: undefined;

    createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
    createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(ctor: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R;

    invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R;

    createChild(services: ServiceCollection): IInstantiationService;
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

export function refineServiceDecorator<T1, T extends T1>(serviceIdentifier: ServiceIdentifier<T1>): ServiceIdentifier<T> {
    return <ServiceIdentifier<T>>serviceIdentifier;
}