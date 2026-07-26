'use client'
import { useState } from "react"
import { format } from "date-fns"
import {
  Power,
  ScrollText,
  Trash2,
  Clock,
  Hand,
  Loader,
  CheckCircle2,
  XCircle,
  RotateCw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui"
import { mode, type LogEntry } from '../config'

function modeName(value: LogEntry['mode']) {
  return mode.find((m) => m.value === value)?.name ?? value
}

type StatusMeta = { label: string; className: string; icon: LucideIcon }

/**
 * Map a command's processing status to a badge. The consumer that executes the
 * command owns this column and has used several spellings ("error", "failed",
 * "ok"), so each outcome accepts a few aliases — anything unrecognised falls
 * back to "pending" rather than silently reading as a failure.
 */
function statusMeta(status: string): StatusMeta {
  switch (status.trim().toLowerCase()) {
    case 'success':
    case 'succeeded':
    case 'ok':
    case 'done':
      return {
        label: 'สำเร็จ',
        className: 'bg-green-100 text-green-700',
        icon: CheckCircle2,
      }
    case 'error':
    case 'failed':
    case 'fail':
      return {
        label: 'ไม่สำเร็จ',
        className: 'bg-red-100 text-red-700',
        icon: XCircle,
      }
    default:
      return {
        label: 'รอทำ',
        className: 'bg-amber-100 text-amber-700',
        icon: Loader,
      }
  }
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <ScrollText className="size-12" />
      <p>ยังไม่มีประวัติคำสั่ง</p>
    </div>
  )
}

function LogCard({
  log,
  onDelete,
}: {
  log: LogEntry
  onDelete: (id: string) => void
}) {
  const status = log.status ? statusMeta(log.status) : null
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Power
              className={`size-4 shrink-0 ${log.power ? 'text-green-600' : 'text-gray-400'}`}
            />
            <span className="font-medium">
              {log.power ? `${log.temp}°` : 'ปิดเครื่อง'}
            </span>
            <span className="text-sm text-gray-500">
              {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}
            </span>
            <div className="flex gap-1">
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                log.fromCron
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {log.fromCron ? (
                <>
                  <Clock className="size-3" />
                  อัตโนมัติ
                </>
              ) : (
                <>
                  <Hand className="size-3" />
                  สั่งเอง
                </>
              )}
            </span>
            {status && (
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.className}`}
              >
                <status.icon className="size-3" />
                {status.label}
              </span>
              )}
            </div>
          </div>
          {log.power && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>โหมด: {modeName(log.mode)}</span>
              {log.startTime && <span>เริ่ม: {log.startTime}</span>}
              {log.endTime && <span>สิ้นสุด: {log.endTime}</span>}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="ลบคำสั่ง"
          onClick={() => onDelete(log.id)}
          className="shrink-0 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

function LogList({
  logs,
  onDelete,
}: {
  logs: LogEntry[]
  onDelete: (id: string) => void
}) {
  if (logs.length === 0) return <EmptyState />
  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <LogCard key={log.id} log={log} onDelete={onDelete} />
      ))}
    </div>
  )
}

function LogView({
  logs,
  onDelete,
  onReload,
}: {
  logs: LogEntry[]
  onDelete: (id: string) => void
  onReload?: () => void | Promise<void>
}) {
  const normalLogs = logs.filter((log) => !log.daily)
  const dailyLogs = logs.filter((log) => log.daily)
  const [reloading, setReloading] = useState(false)

  const handleReload = async () => {
    if (!onReload || reloading) return
    setReloading(true)
    try {
      await onReload()
    } finally {
      setReloading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium">ประวัติคำสั่ง</h2>
        {onReload && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReload}
            disabled={reloading}
            aria-label="โหลดข้อมูลใหม่"
          >
            <RotateCw className={`size-4 ${reloading ? 'animate-spin' : ''}`} />
            โหลดใหม่
          </Button>
        )}
      </div>
      <Tabs defaultValue="normal">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="normal">คำสั่งปกติ</TabsTrigger>
          <TabsTrigger value="daily">ทำทุกวัน</TabsTrigger>
        </TabsList>
        <TabsContent value="normal" className="mt-4">
          <LogList logs={normalLogs} onDelete={onDelete} />
        </TabsContent>
        <TabsContent value="daily" className="mt-4">
          <LogList logs={dailyLogs} onDelete={onDelete} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LogView
