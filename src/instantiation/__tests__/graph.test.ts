import { Graph } from "../../common/graph";

describe("Graph", () => {
    let graph: Graph<string>;
    beforeAll(() => {
        graph = new Graph<string>(s => s);
    });
    afterEach(() => {
        graph.clear();
    })
    // 尝试查找不存在的节点
    test("is possible to lookup nodes that don't exist", () => {
        expect(graph.lookup("ddd")).toStrictEqual(undefined);
    });

    // 节点不存在时插入
    test("inserts nodes when not there yet", () => {
        expect(graph.lookup('ddd')).toStrictEqual(undefined);
        expect(graph.lookupOrInsertNode('ddd').data).toStrictEqual('ddd');
        expect(graph.lookup('ddd')!.data).toStrictEqual('ddd');
    });

    // 移出节点
    test("can remove nodes and get length", () => {
        expect(graph.isEmpty()).toBeTruthy();
        expect(graph.lookup('ddd')).toBe(undefined);
        expect(graph.lookupOrInsertNode('ddd').data).toBe("ddd");
        expect(!graph.isEmpty()).toBeTruthy();
        graph.removeNode('ddd');
        expect(graph.lookup('ddd')).toBe(undefined);
        expect(graph.isEmpty()).toBeTruthy();
    });

    test('root', () => {
        graph.insertEdge('1', '2');
        let roots = graph.roots();
        expect(roots.length).toStrictEqual(1);
        expect(roots[0].data).toStrictEqual('2');
        console.log(roots);
        graph.insertEdge('2', '1');
        roots = graph.roots();
        expect(roots.length).toStrictEqual(0);

    });

    test('root complex', () => {
        graph.insertEdge('1', '2');
        graph.insertEdge('1', '3');
        graph.insertEdge('3', '4');

        const roots = graph.roots();
        expect(roots.length).toStrictEqual(2);
        expect(['2', '4'].every(n => roots.some(node => node.data === n))).toBeTruthy()
    })

})