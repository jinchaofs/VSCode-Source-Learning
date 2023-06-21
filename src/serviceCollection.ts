import { ServiceIdentifier } from './instantiation'
import { SyncDescriptor } from './descriptor'

/**
 * 服务集合
 * 管理注册服务，便于其他模块使用，比如插件系统
 */
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