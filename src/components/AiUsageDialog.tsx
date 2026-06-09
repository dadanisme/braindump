import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAiUsageList, useAiUsageTotal } from '@/hooks/useAiUsage';
import type { AiUsageRow } from '@/lib/types';
import { formatIdr, formatIdrAmount } from '@/lib/pricing';
import { cn } from '@/lib/cn';

const PAGE_SIZE = 25;

type Props = {
  open: boolean;
  userId: string;
  onClose: () => void;
};

const numberFmt = new Intl.NumberFormat('en-US');

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AiUsageDialog({ open, userId, onClose }: Props) {
  const [page, setPage] = useState(0);
  const list = useAiUsageList(userId, page, PAGE_SIZE, open);
  const total = useAiUsageTotal(userId, open);

  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))
    : 1;

  const columns = useMemo<ColumnDef<AiUsageRow>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Time',
        cell: (info) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatTimestamp(info.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'model_name',
        header: 'Model',
        cell: (info) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: 'input_tokens',
        header: 'In',
        cell: (info) => (
          <span className="tabular-nums">
            {numberFmt.format(info.getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'output_tokens',
        header: 'Out',
        cell: (info) => (
          <span className="tabular-nums">
            {numberFmt.format(info.getValue<number>())}
          </span>
        ),
      },
      {
        id: 'cost',
        header: 'Cost',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatIdr(
              Number(row.original.cost_usd),
              Number(row.original.fx_rate_idr),
            )}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const status = info.getValue<'success' | 'error'>();
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                status === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {status}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: list.data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const totalCostIdr =
    total.data && formatIdrAmount(total.data.totalCostIdr);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI usage</DialogTitle>
          <DialogDescription className="text-[12px]">
            Tokens and cost across every model call from this account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="Total spent"
            value={total.isLoading ? null : (totalCostIdr ?? '—')}
            big
          />
          <Stat
            label="Calls"
            value={
              total.isLoading
                ? null
                : numberFmt.format(total.data?.totalCalls ?? 0)
            }
          />
          <Stat
            label="Tokens"
            value={
              total.isLoading
                ? null
                : numberFmt.format(total.data?.totalTokens ?? 0)
            }
          />
        </div>

        <Separator />

        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {list.isLoading && !list.data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`s-${i}`}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No usage logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>
            {list.data
              ? `Page ${page + 1} of ${totalPages} · ${list.data.total} entries`
              : '—'}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={page === 0 || list.isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={
                page + 1 >= totalPages || list.isFetching || !list.data
              }
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  big = false,
}: {
  label: string;
  value: string | null;
  big?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {value === null ? (
        <Skeleton className={big ? 'h-7 w-28' : 'h-5 w-16'} />
      ) : (
        <span
          className={cn(
            'tabular-nums',
            big ? 'text-2xl font-semibold tracking-tight' : 'text-base',
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}
