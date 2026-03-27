import { deleteLedgerAccountForm } from "@/actions/accounts";
import { AccountNodeActions } from "@/components/account-node-actions";
import type { SerializableLedgerTreeNode } from "@/lib/ledger-account-tree";
import { ROOT_ACCOUNT_NAMES } from "@/lib/ledger-account-rules";
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
            {!ROOT_ACCOUNT_NAMES.has(node.path) ? (
              <>
                <AccountNodeActions fullPath={node.path} />
                {node.accountId && node.children.length === 0 ? (
                  <form action={deleteLedgerAccountForm.bind(null, node.accountId)}>
                    <Button type="submit" variant="ghost" size="xs" className="text-destructive hover:text-destructive h-7 px-2">
                      Remove
                    </Button>
                  </form>
                ) : null}
              </>
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
