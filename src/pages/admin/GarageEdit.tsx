import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PhotoGrid } from '@/components/vehicle/PhotoGrid'
import { SpecTable } from '@/components/vehicle/SpecTable'
import { Checkbox } from '@/components/ui/checkbox'
import { CATALOG, COLORS } from '@/data/vehicleCatalog'
import { newId } from '@/lib/id'
import { useStore } from '@/store/index'
import { MIN_PHOTOS } from '@/store/selectors'
import type {
  BodyType,
  Drive,
  Fuel,
  Grade,
  InteriorGrade,
  Transmission,
  Vehicle,
} from '@/types'

const GRADES: Grade[] = ['S', '5', '4.5', '4', '3.5', '3', '2', 'R']
const INTERIOR: InteriorGrade[] = ['A', 'B', 'C', 'D']
const FUELS: Fuel[] = ['汽油', '柴油', '油電', '電動']
const TRANSMISSIONS: Transmission[] = ['AT', 'MT', 'CVT']
const DRIVES: Drive[] = ['FF', 'FR', '4WD']
const BODY_TYPES: BodyType[] = ['房車', 'SUV', '七人車', '輕自動車', '商用車']

function randomSeeds() {
  return Array.from({ length: MIN_PHOTOS }, () => Math.floor(Math.random() * 99_999) + 1)
}

function blank(): Vehicle {
  const first = CATALOG[0].models[0]
  return {
    id: newId('v'),
    orderNo: '',
    brand: CATALOG[0].brand,
    model: first.model,
    year: new Date().getFullYear() - 5,
    mileage: 50_000,
    plate: '',
    vin: '',
    displacement: first.displacement,
    fuel: first.fuel,
    transmission: first.transmission,
    drive: first.drive,
    color: COLORS[0],
    seats: first.seats,
    bodyType: first.bodyType,
    grade: '4',
    interiorGrade: 'B',
    photoSeeds: randomSeeds(),
    remarks: '',
    loanBalance: 1_000_000,
    status: '在庫',
    documentsReady: false,
    relistCount: 0,
    createdAt: Date.now(),
  }
}

export default function GarageEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicles = useStore((s) => s.vehicles)
  const saveVehicle = useStore((s) => s.saveVehicle)

  const existing = id ? vehicles.find((v) => v.id === id) : undefined
  const [form, setForm] = useState<Vehicle>(() => existing ?? blank())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)

  const models = useMemo(
    () => CATALOG.find((c) => c.brand === form.brand)?.models ?? [],
    [form.brand],
  )

  const set = <K extends keyof Vehicle>(key: K, value: Vehicle[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!form.orderNo.trim()) next.orderNo = '請填寫訂單號'
    if (!form.plate.trim()) next.plate = '請填寫車牌'
    if (!form.vin.trim()) next.vin = '請填寫車身號碼'
    if (form.year < 1990 || form.year > new Date().getFullYear() + 1) next.year = '年份不合理'
    if (form.mileage < 0) next.mileage = '里程不得為負'
    if (form.photoSeeds.length === 0) next.photoSeeds = '至少需要一張照片'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function submit() {
    saveVehicle(form)
    toast.success(existing ? '車輛資料已更新' : '車輛已新增至車庫')
    navigate('/admin/garage')
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={existing ? '編輯車輛' : '新增車輛'}
        description="車商看得到除「內部資訊」以外的所有欄位。"
        backTo="/admin/garage"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (validate()) setPreview(true)
        }}
        className="space-y-4"
      >
        <Section title="基本資料">
          <Field label="訂單號" error={errors.orderNo}>
            <Input
              value={form.orderNo}
              onChange={(e) => set('orderNo', e.target.value)}
              placeholder="ORD-2026-0001"
            />
          </Field>
          <Field label="廠牌">
            <NativeSelect
              value={form.brand}
              options={CATALOG.map((c) => c.brand)}
              onChange={(v) => {
                const first = CATALOG.find((c) => c.brand === v)!.models[0]
                setForm((f) => ({
                  ...f,
                  brand: v,
                  model: first.model,
                  bodyType: first.bodyType,
                  fuel: first.fuel,
                  transmission: first.transmission,
                  drive: first.drive,
                  displacement: first.displacement,
                  seats: first.seats,
                }))
              }}
            />
          </Field>
          <Field label="車型">
            <NativeSelect
              value={form.model}
              options={models.map((m) => m.model)}
              onChange={(v) => set('model', v)}
            />
          </Field>
          <Field label="年份" error={errors.year}>
            <Input
              type="number"
              value={form.year}
              onChange={(e) => set('year', Number(e.target.value))}
            />
          </Field>
          <Field label="車牌" error={errors.plate}>
            <Input
              value={form.plate}
              onChange={(e) => set('plate', e.target.value)}
              placeholder="品川 330 あ 12-34"
            />
          </Field>
          <Field label="車身號碼" error={errors.vin}>
            <Input value={form.vin} onChange={(e) => set('vin', e.target.value)} />
          </Field>
        </Section>

        <Section title="規格">
          <Field label="里程 (km)" error={errors.mileage}>
            <Input
              type="number"
              value={form.mileage}
              onChange={(e) => set('mileage', Number(e.target.value))}
            />
          </Field>
          <Field label="排氣量 (cc)">
            <Input
              type="number"
              value={form.displacement}
              onChange={(e) => set('displacement', Number(e.target.value))}
            />
          </Field>
          <Field label="燃料">
            <NativeSelect
              value={form.fuel}
              options={FUELS}
              onChange={(v) => set('fuel', v as Fuel)}
            />
          </Field>
          <Field label="變速箱">
            <NativeSelect
              value={form.transmission}
              options={TRANSMISSIONS}
              onChange={(v) => set('transmission', v as Transmission)}
            />
          </Field>
          <Field label="驅動方式">
            <NativeSelect
              value={form.drive}
              options={DRIVES}
              onChange={(v) => set('drive', v as Drive)}
            />
          </Field>
          <Field label="顏色">
            <NativeSelect value={form.color} options={COLORS} onChange={(v) => set('color', v)} />
          </Field>
          <Field label="座位數">
            <Input
              type="number"
              value={form.seats}
              onChange={(e) => set('seats', Number(e.target.value))}
            />
          </Field>
          <Field label="車型分類">
            <NativeSelect
              value={form.bodyType}
              options={BODY_TYPES}
              onChange={(v) => set('bodyType', v as BodyType)}
            />
          </Field>
        </Section>

        <Section title="車況">
          <Field label="車體評級">
            <NativeSelect
              value={form.grade}
              options={GRADES}
              onChange={(v) => set('grade', v as Grade)}
            />
          </Field>
          <Field label="內裝評級">
            <NativeSelect
              value={form.interiorGrade}
              options={INTERIOR}
              onChange={(v) => set('interiorGrade', v as InteriorGrade)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Label htmlFor="remarks" className="mb-1.5 block text-sm">
              備註
            </Label>
            <Textarea
              id="remarks"
              rows={3}
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
            />
          </div>
        </Section>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">照片</h2>
          <p className="mb-3 text-xs text-slate-500">
            上架前檢核要求至少 {MIN_PHOTOS} 張（外觀四角、正背面、左右側、引擎室、行李廂、
            儀表板含里程、前後座、四條輪胎、鑰匙、傷痕特寫）。目前 {form.photoSeeds.length} 張。
          </p>
          <PhotoGrid seeds={form.photoSeeds} onChange={(next) => set('photoSeeds', next)} />
          {errors.photoSeeds && <p className="mt-2 text-xs text-rose-600">{errors.photoSeeds}</p>}
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">文件</h2>
          <div className="flex items-center gap-2.5">
            <Checkbox
              id="documentsReady"
              checked={form.documentsReady}
              onCheckedChange={(v) => set('documentsReady', v === true)}
            />
            <Label htmlFor="documentsReady" className="text-sm font-medium">
              文件已到齊
            </Label>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            行照、保養紀錄、驗車紀錄、事故紀錄、未繳罰單。未到齊無法上架。
          </p>
        </Card>

        <Card className="border-dashed bg-slate-50 p-4">
          <h2 className="mb-1 text-sm font-semibold">內部資訊</h2>
          <p className="mb-3 text-xs text-slate-500">此區塊不會顯示給車商。</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="貸款未償餘額">
              <Input
                type="number"
                value={form.loanBalance}
                onChange={(e) => set('loanBalance', Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/garage')}>
            取消
          </Button>
          <Button type="submit">預覽並儲存</Button>
        </div>
      </form>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>將以此內容顯示給車商</DialogTitle>
            <DialogDescription>
              「內部資訊」區塊的貸款餘額不會出現在車商端。
            </DialogDescription>
          </DialogHeader>
          <SpecTable vehicle={form} showInternal={false} />
          {form.remarks && <p className="text-sm text-slate-600">{form.remarks}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(false)}>
              返回修改
            </Button>
            <Button onClick={submit}>確認儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </Card>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-sm">
        {label}
        <span className="mt-1.5 block font-normal">{children}</span>
      </Label>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

/**
 * 這張表單有十幾個下拉，原生 select 在密集表單裡更快也更容易鍵盤操作；
 * shadcn 的 Select 留給少量、需要搭配 icon 的場合。
 */
function NativeSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
