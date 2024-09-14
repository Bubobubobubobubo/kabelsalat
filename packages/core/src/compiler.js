import { Node, nodeRegistry } from "./graph.js";

export function compile(node, options = {}) {
  const {
    log = false,
    lang = "js",
    fallbackType = "thru",
    constType = "n",
    varPrefix = "n",
  } = options;
  log && console.log("compile", node);
  const nodes = topoSort(node);
  let lines = [];
  let v = (id) => {
    if (nodes[id].type !== constType) {
      return `${varPrefix}${id}`;
    }
    if (typeof nodes[id].value === "string") {
      return `"${nodes[id].value}"`;
    }
    return nodes[id].value;
  };
  const ugens = [];

  for (let id in nodes) {
    const node = nodes[id];
    const vars = nodes[id].ins.map((inlet) => v(nodes.indexOf(inlet)));
    const ugenIndex = ugens.length;

    let schema = nodeRegistry.get(node.type);
    if (!schema) {
      console.warn(
        `unhandled node type "${nodes[id].type}". falling back to "${fallbackType}"`
      );
      schema = nodeRegistry.get(fallbackType);
    }
    const meta = {
      vars,
      node,
      nodes,
      id,
      ugenIndex,
      ugen: schema.ugen,
      name: v(id),
      lang,
    };
    if (schema.compile) {
      lines.push(schema.compile(meta));
    }
    if (schema.ugen) {
      ugens.push({ type: schema.ugen, inputs: vars });
    }
  }

  const src = lines.join("\n");
  if (log) {
    console.log("compiled code:");
    console.log(src);
  }
  return { src, ugens };
}

Node.prototype.compile = function (options) {
  return compile(this.dagify(), options);
};

// simple topo sort using dfs
// khans algorithm seems overkill, because our graphs are relatively small
// dfs only becomes a problem when max depth is near the recursion limit (longest chain = 10000)
function topoSort(graph) {
  const sorted = [];
  const visited = new Set();
  function dfs(node) {
    if (typeof node !== "object" || visited.has(node)) {
      return;
    }
    visited.add(node);
    for (let i in node.ins) {
      dfs(node.ins[i]);
    }
    sorted.push(node);
  }
  dfs(graph);
  return sorted;
}
