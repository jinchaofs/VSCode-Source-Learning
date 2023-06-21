
/**
 * 图的节点
 */
export class Node<T> {
    /**
     * 存储指向当前节点的边，键是边的目标节点的键，值是目标节点对象
     */
    readonly incoming = new Map<string, Node<T>>();
    /**
     * 存储从当前节点出发的边，键是边的目标节点的键，值是目标节点对象
     */
    readonly outgoing = new Map<string, Node<T>>(); 

    constructor(
        // 节点的key
        readonly key: string, 
        // 节点数据
        readonly data: T
    ) {}
}

/**
 * 图
 */
export class Graph<T> {
    /**
     * 存储图中所有节点，键是节点的键，值是节点对象
     */
    private readonly _nodes = new Map<string, Node<T>>();

    constructor(private readonly _hashFn: (element: T) => string) {}

    /**
     * 返回途中所有没有出边（outgoing）的节点，即根节点数组
     * @returns 
     */
    roots(): Node<T>[] {
        const ret: Node<T>[] = [];
        for (const node of this._nodes.values()) {
            if (node.outgoing.size === 0) {
                ret.push(node);
            }
        }
        return ret;
    }
    /**
     * 插入一条从节点 from 到节点 to 的边，同时更新节点的出边和入边映射
     * @param from 
     * @param to 
     */
    insertEdge(from: T, to: T): void {
      const fromNode = this.lookupOrInsertNode(from);
      const toNode = this.lookupOrInsertNode(to);
      fromNode.outgoing.set(toNode.key, toNode);
      toNode.incoming.set(fromNode.key, fromNode);  
    }

    /**
     * 移出具有指定数据的节点，同时更新其他节点的出边和入边映射
     * @param data 
     */
    removeNode(data: T): void {
        const key = this._hashFn(data);
        this._nodes.delete(key);
        for (const node of this._nodes.values()) {
            node.outgoing.delete(key);
            node.incoming.delete(key);
        }
    }

    /**
     * 根据数据查找节点，如果不存在则新建，并插入图中
     * @param data 
     * @returns 
     */
    lookupOrInsertNode(data: T): Node<T> {
        const key = this._hashFn(data);
        let node = this._nodes.get(key);
        if (!node) {
            node = new Node(key, data);
            this._nodes.set(key, node);
        }
        return node;
    }

    /**
     * 根据数据查找节点
     * @param data 
     * @returns 
     */
    lookup(data: T): Node<T> | undefined {
        return this._nodes.get(this._hashFn(data));
    }

    /**
     * 判断图是否为空
     * @returns 
     */
    isEmpty(): boolean {
        return this._nodes.size === 0;
    }

    toString(): string {
        const data: string[] = [];
        for (const [key, value] of this._nodes) {
            data.push(`${key}\n\t(-> incoming)[${[...value.incoming.keys()].join(', ')}]\n\t(outgoing ->)[${[...value.outgoing.keys()].join(',')}]\n`);
        }
        return data.join('\n');
    }

    /**
     * 蛮力算法（Brute Force Algorithm）查找图中是否存在环
     * @returns 
     */
    findCycleSlow() {
        for (const [id, node] of this._nodes) {
            const seen = new Set<string>([id]);
            const res = this._findCycle(node, seen);
            if (res) {
                return res;
            }
        }
        return undefined;
    }

    /**
     * 从当前节点出发，查找所有出边是否存在环
     * 深度优先遍历
     * @param node 
     * @param seen 
     * @returns 
     */
    private _findCycle(node: Node<T>, seen: Set<string>): string | undefined {
        for (const [id, outgoing] of node.outgoing) {
            // 已访问过的列表中存在该节点，表示存在环
            if (seen.has(id)) {
                return [...seen, id].join(' -> ');
            }
            // 该次查找不存在环，添加到已访问列表
            seen.add(id);
            // 递归进行该条出边的深度查找
            const value = this._findCycle(outgoing, seen);
            // 如果值不为空，则表示存在环，退出
            if (value) {
                return value;
            }
            // 该出边链路不存在环，将访问过的id删除
            seen.delete(id);
        }
        return undefined;
    }

    clear() {
       this._nodes.clear();
    }

}