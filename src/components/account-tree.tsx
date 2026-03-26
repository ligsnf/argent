import { deleteLedgerAccountForm } from "@/actions/accounts";
import type { SerializableLedgerTreeNode } from "@/lib/ledger-account-tree";
import { Button } from "@/components/ui/button";

function AccountTreeLevel({
  nodes,
  depth,
}: {
  nodes: SerializableLedgerTreeNode[];
  depth: number;
}) {
  return (
    <ul className={depth > 0 ? "border-border ml-3 border-l pl-3" : "space-y-1"}>
      {nodes.map((node) => (
        <li key={node.path} className="list-none py-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{node.segment}</span>
            {node.accountType ? (
              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs capitalize">
                {node.accountType}
              </span>
            ) : null}
            {node.accountId ? (
              <form action={deleteLedgerAccountForm.bind(null, node.accountId)}>
                <Button type="submit" variant="ghost" size="xs" className="text-destructive hover:text-destructive h-7 px-2">
                  Remove
                </Button>
              </form>
            ) : null}
          </div>
          {node.children.length > 0 ? (
            <AccountTreeLevel nodes={node.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function AccountTree({ nodes }: { nodes: SerializableLedgerTreeNode[] }) {
  if (nodes.length === 0) {
    return <p className="text-muted-foreground text-sm">No accounts yet.</p>;
  }
  return <AccountTreeLevel nodes={nodes} depth={0} />;
}
