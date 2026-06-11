'use client'
import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io"
import { Power, SlidersHorizontal, ScrollText, Loader2 } from "lucide-react"
import { Button } from '@/shared/ui'
import { toast } from 'sonner'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Label,
  TimePicker
} from "@/shared/ui"
import { mode, IMode, type LogEntry } from '../config'
import {
  pushCommand,
  pushSchedule,
  fetchLogs,
  deleteLog,
  fetchLatestCommand,
} from '../model/command'
import LogView from './logView'

const MIN_TEMP = 20
const MAX_TEMP = 30

type View = 'remote' | 'log'

function RemotePage() {
  const [view, setView] = useState<View>('remote')
  const [power, setPower] = useState(false)
  const [temp, setTemp] = useState(25)
  const [sMode, setSMode] = useState<IMode>(mode[0].value)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await fetchLogs())
    } catch (err) {
      console.error(err)
      toast.error('โหลดประวัติไม่สำเร็จ')
    }
  }, [])

  const loadLatest = useCallback(async () => {
    try {
      const latest = await fetchLatestCommand()
      if (!latest) return
      setPower(latest.power)
      setTemp(latest.temp)
      setSMode(latest.mode)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadLogs(), loadLatest()]).finally(() => setLoading(false))
  }, [loadLogs, loadLatest])

  const removeLog = async (id: string) => {
    try {
      await deleteLog(id)
      setLogs((prev) => prev.filter((log) => log.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('ลบไม่สำเร็จ')
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-full sm:w-120 flex items-center justify-center bg-gray-300">
        <Loader2 className="size-10 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="h-screen w-full sm:w-120 flex flex-col bg-gray-300">
      <div className="grow overflow-auto">
        {view === 'remote' ? (
          <div className="flex flex-col min-h-full">
            <TopPart temp={temp} power={power} setPower={setPower} />
            <BottomPart
              temp={temp}
              setTemp={setTemp}
              power={power}
              sMode={sMode}
              setSMode={setSMode}
              onSubmitted={loadLogs}
            />
          </div>
        ) : (
          <LogView logs={logs} onDelete={removeLog} />
        )}
      </div>
      <BottomBar view={view} setView={setView} />
    </div>
  )
}
export default RemotePage

function BottomBar({
  view,
  setView,
}: {
  view: View
  setView: (data: View) => void
}) {
  const items: { value: View; name: string; icon: typeof Power }[] = [
    { value: 'remote', name: 'รีโมท', icon: SlidersHorizontal },
    { value: 'log', name: 'ประวัติคำสั่ง', icon: ScrollText },
  ]
  return (
    <nav className="shrink-0 grid grid-cols-2 border-t bg-gray-200">
      {items.map((item) => {
        const active = view === item.value
        return (
          <button
            type="button"
            key={item.value}
            onClick={() => setView(item.value)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              active ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <item.icon className="size-5" />
            <span className="text-xs">{item.name}</span>
          </button>
        )
      })}
    </nav>
  )
}

function TopPart({
  temp,
  power,
  setPower,
}: {
  temp: number
  power: boolean
  setPower: (data: boolean) => void
}) {
  return (
    <div className="h-56 w-full relative">
      <Button
        type="button"
        onClick={() => setPower(!power)}
        size="icon-lg"
        variant={power ? 'default' : 'secondary'}
        aria-pressed={power}
        aria-label={power ? 'ปิดเครื่อง' : 'เปิดเครื่อง'}
        className="absolute top-4 right-4 w-14 h-14 rounded-full"
      >
        <Power className="size-6" />
      </Button>
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl remoteFont font-bold transition-opacity ${
          power ? 'opacity-100' : 'opacity-30'
        }`}
      >
        {power ? temp : '--'}
      </div>
    </div>
  )
}

function BottomPart({
  setTemp,
  temp,
  power,
  sMode,
  setSMode,
  onSubmitted,
}: {
  setTemp: (data: number) => void
  temp: number
  power: boolean
  sMode: IMode
  setSMode: (data: IMode) => void
  onSubmitted: () => void | Promise<void>
}) {
  const [daily, setDaily] = useState(false)
  const [startTime, setStartTime] = useState<Date | undefined>()
  const [endTime, setEndTime] = useState<Date | undefined>()

  const up = () => {
    setTemp(Math.min(temp + 1, MAX_TEMP))
  }
  const down = () => {
    setTemp(Math.max(temp - 1, MIN_TEMP))
  }

  const handleSubmit = async () => {
    try {
      if (daily && power) {
        if (!startTime || !endTime) {
          toast.error('กรุณาเลือกเวลาเริ่มต้นและสิ้นสุด')
          return
        }
        await pushSchedule({
          start_time: format(startTime, 'HH:mm'),
          end_time: format(endTime, 'HH:mm'),
          target_temp: temp,
          mode: sMode,
          is_enabled: true,
        })
      } else {
        await pushCommand({
          action: power ? 'TURN_ON' : 'TURN_OFF',
          temp,
          status: 'pending',
          mode: sMode,
        })
      }
    } catch (err) {
      console.error(err)
      toast.error('ส่งคำสั่งไม่สำเร็จ')
      return
    }
    await onSubmitted()
    toast.success("success")
  }
  return (
    <div className="bg-gray-200 rounded-t-2xl flex flex-col gap-6 p-6 grow">
      <div className="w-full flex flex-col items-center gap-2">
        <Button
          type="button"
          onClick={up}
          disabled={!power || temp >= MAX_TEMP}
          size="icon-lg"
          className="w-15 h-15"
        >
          <IoIosArrowUp className="size-8" />
        </Button>
        <Button
          type="button"
          onClick={down}
          disabled={!power || temp <= MIN_TEMP}
          size="icon-lg"
          className="w-15 h-15"
        >
          <IoIosArrowDown className="size-8" />
        </Button>
      </div>
      <div>
        <Label className=' pb-2' htmlFor='mode'>โหมด</Label>
        <Tabs id='mode' value={sMode} onValueChange={(v) => setSMode(v as IMode)}>
          <TabsList variant={`line`} className={`w-full`}>
            {mode.map((item) => (
              <TabsTrigger disabled={!power} key={item.value} value={item.value}>
                <item.icon className="size-4" />
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>เวลา</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-2'>
            <Switch
              disabled={!power}
              id="cronjob"
              checked={daily}
              onCheckedChange={setDaily}
            />
            <Label htmlFor='cronjob'>ทำทุกวัน</Label>
          </div>
          <div className=' mt-2'>
            <TimePicker
              disabled={!power}
              label='เลือกเวลาเริ่มต้น'
              value={startTime}
              onChange={setStartTime}
            />
            <TimePicker
              disabled={!power}
              label='เลือกเวลาสิ้นสุด'
              value={endTime}
              onChange={setEndTime}
            />
          </div>
        </CardContent>
      </Card>
      <Button type="button" onClick={handleSubmit}>Confirm</Button>
    </div>
  )
}
