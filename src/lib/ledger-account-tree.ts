export type LedgerAccountRow = {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
};

export type LedgerAccountTreeNode = {
  segment: string;
  path: string;
  account?: LedgerAccountRow;
  children: LedgerAccountTreeNode[];
};

export function buildLedgerAccountTree(accounts: LedgerAccountRow[]): LedgerAccountTreeNode[] {
  const sorted = [...accounts].sort((a, b) => a.name.localeCompare(b.name));
  const root: LedgerAccountTreeNode[] = [];

  function findOrCreateChild(nodes: LedgerAccountTreeNode[], segment: string, path: string): LedgerAccountTreeNode {
    let node = nodes.find((n) => n.segment === segment);
    if (!node) {
      node = { segment, path, children: [] };
      nodes.push(node);
      nodes.sort((a, b) => a.segment.localeCompare(b.segment));
    }
    return node;
  }

  for (const acc of sorted) {
    const parts = acc.name.split(":");
    let level = root;
    let pathPrefix = "";
    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i]!;
      pathPrefix = i === 0 ? segment : `${pathPrefix}:${segment}`;
      const node = findOrCreateChild(level, segment, pathPrefix);
      if (i === parts.length - 1) {
        node.account = acc;
      }
      level = node.children;
    }
  }

  return root;
}

export type SerializableLedgerTreeNode = {
  segment: string;
  path: string;
  accountId: string | null;
  accountType: string | null;
  children: SerializableLedgerTreeNode[];
};

export function serializeLedgerTree(nodes: LedgerAccountTreeNode[]): SerializableLedgerTreeNode[] {
  return nodes.map((n) => ({
    segment: n.segment,
    path: n.path,
    accountId: n.account?.id ?? null,
    accountType: n.account?.type ?? null,
    children: serializeLedgerTree(n.children),
  }));
}
