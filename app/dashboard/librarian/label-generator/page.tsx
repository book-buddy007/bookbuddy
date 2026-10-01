'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { FormField } from "@/components/ui/form-field";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_SINGLE = {
  labelType: "spine",
  labelSize: "standard",
  labelContent: "",
  includeBarcode: true,
  includeQrCode: false,
  showTitle: true,
  showAuthor: true,
  showCallNumber: true,
  startingPosition: "1",
  numberOfCopies: "1",
};

const DEFAULT_BATCH = {
  dataSource: "catalog",
  fileUpload: "",
  labelType: "spine",
  labelSize: "standard",
  includeBarcode: true,
  includeQrCode: false,
};

const LABEL_TYPES = [
  { value: "spine", label: "Spine label" },
  { value: "pocket", label: "Pocket label" },
  { value: "card", label: "Card label" },
  { value: "barcode", label: "Barcode label" },
];

const LABEL_SIZES = [
  { value: "standard", label: 'Standard (1" x 1.5")', ratio: "2 / 3" },
  { value: "small", label: 'Small (0.5" x 1")', ratio: "1 / 2" },
  { value: "large", label: 'Large (2" x 3")', ratio: "2 / 3" },
  { value: "custom", label: "Custom size", ratio: "2 / 3" },
];

const templates: { name: string; used: string; icon: BBIconName; note: string }[] = [
  { name: "Standard spine label", used: "Last used 2 days ago", icon: "tag", note: "With barcode" },
  { name: "QR resource label", used: "Last used 1 week ago", icon: "scan", note: "With QR code" },
];

const SelectField = ({ id, label, value, onChange, options }: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <FormField label={label} htmlFor={id}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </FormField>
);

const CheckField = ({ id, label, checked, onChange }: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center gap-2">
    <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
    <Label htmlFor={id} className="font-normal">{label}</Label>
  </div>
);

// Decorative barcode: bars are CSS, not a scannable code.
const BarcodeStrip = () => (
  <div
    aria-hidden
    className="h-10 w-full max-w-[9rem] rounded-sm"
    style={{
      backgroundImage:
        "repeating-linear-gradient(90deg, #0A0F24 0 2px, transparent 2px 4px, #0A0F24 4px 5px, transparent 5px 8px, #0A0F24 8px 11px, transparent 11px 13px)",
    }}
  />
);

const sectionCard = "rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6";

const LabelGeneratorPage = () => {
  const { toast } = useToast();
  const [single, setSingle] = useState({ ...DEFAULT_SINGLE });
  const [batch, setBatch] = useState({ ...DEFAULT_BATCH });

  const setS = <K extends keyof typeof DEFAULT_SINGLE>(k: K, v: (typeof DEFAULT_SINGLE)[K]) =>
    setSingle((p) => ({ ...p, [k]: v }));
  const setB = <K extends keyof typeof DEFAULT_BATCH>(k: K, v: (typeof DEFAULT_BATCH)[K]) =>
    setBatch((p) => ({ ...p, [k]: v }));

  const notAvailable = (e?: React.FormEvent) => {
    e?.preventDefault();
    toast({
      title: "Printing isn't available yet",
      description: "The preview shows the layout. Label printing and saving will arrive in a later update.",
    });
  };

  const ratio = LABEL_SIZES.find((s) => s.value === single.labelSize)?.ratio ?? "2 / 3";
  const callNumber = single.labelContent.trim() || "FIC ROW";

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Label generator"
        description="Create and print labels for your library resources."
        actions={<Chip icon="info">Printing not available yet</Chip>}
      />

      <Tabs defaultValue="single" className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="single">Single label</TabsTrigger>
          <TabsTrigger value="batch">Batch labels</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={notAvailable} className={`${sectionCard} space-y-5 lg:col-span-2`}>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Generate single label</h2>
                <p className="text-[13px] text-bb-muted">Create a label for individual items</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <SelectField id="labelType" label="Label type" value={single.labelType} onChange={(v) => setS("labelType", v)} options={LABEL_TYPES} />
                <SelectField id="labelSize" label="Label size" value={single.labelSize} onChange={(v) => setS("labelSize", v)} options={LABEL_SIZES} />
              </div>

              <FormField label="Label content (call number, etc.)" htmlFor="labelContent">
                <Input
                  id="labelContent"
                  placeholder="Enter call number or scan barcode"
                  value={single.labelContent}
                  onChange={(e) => setS("labelContent", e.target.value)}
                />
              </FormField>

              <div className="grid gap-5 md:grid-cols-2">
                <SelectField
                  id="startingPosition"
                  label="Starting position"
                  value={single.startingPosition}
                  onChange={(v) => setS("startingPosition", v)}
                  options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `Position ${n}` }))}
                />
                <FormField label="Number of copies" htmlFor="numberOfCopies">
                  <Input
                    id="numberOfCopies"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={single.numberOfCopies}
                    onChange={(e) => setS("numberOfCopies", e.target.value)}
                  />
                </FormField>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-[13px] font-semibold">Include elements</legend>
                <div className="grid grid-cols-2 gap-3">
                  <CheckField id="showTitle" label="Show title" checked={single.showTitle} onChange={(v) => setS("showTitle", v)} />
                  <CheckField id="showAuthor" label="Show author" checked={single.showAuthor} onChange={(v) => setS("showAuthor", v)} />
                  <CheckField id="showCallNumber" label="Show call number" checked={single.showCallNumber} onChange={(v) => setS("showCallNumber", v)} />
                  <CheckField id="includeBarcode" label="Include barcode" checked={single.includeBarcode} onChange={(v) => setS("includeBarcode", v)} />
                  <CheckField id="includeQrCode" label="Include QR code" checked={single.includeQrCode} onChange={(v) => setS("includeQrCode", v)} />
                </div>
              </fieldset>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSingle({ ...DEFAULT_SINGLE })}>
                  Reset
                </Button>
                <Button type="submit">Generate label</Button>
              </div>
            </form>

            <section className={sectionCard}>
              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Label preview</h2>
              <p className="mb-4 text-[13px] text-bb-muted">Sample content, live layout</p>

              <div className="flex justify-center rounded-2xl bg-bb-surface-2 p-4">
                <div
                  className="flex w-40 flex-col items-center justify-between rounded-md bg-white p-3 text-center text-bb-ink shadow-e1"
                  style={{ aspectRatio: ratio }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide">Sample library</p>
                  <div className="space-y-1">
                    {single.showCallNumber && <p className="text-lg font-extrabold leading-none">{callNumber}</p>}
                    {single.showTitle && <p className="text-[11px] font-semibold">Harry Potter</p>}
                    {single.showAuthor && <p className="text-[10px]">J.K. Rowling</p>}
                  </div>
                  <div className="flex w-full flex-col items-center gap-1">
                    {single.includeBarcode && <BarcodeStrip />}
                    {single.includeQrCode && <Icon name="scan" size={28} />}
                    {(single.includeBarcode || single.includeQrCode) && <p className="font-mono text-[9px]">123456789</p>}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => notAvailable()}>
                  <Icon name="download" size={16} /> Save
                </Button>
                <Button size="sm" onClick={() => notAvailable()}>
                  <Icon name="printer" size={16} /> Print
                </Button>
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-0">
          <form onSubmit={notAvailable} className={`${sectionCard} max-w-3xl space-y-5`}>
            <div>
              <h2 className="font-display text-lg font-extrabold tracking-[-0.02em]">Batch label generation</h2>
              <p className="text-[13px] text-bb-muted">Generate multiple labels at once from your library or a file</p>
            </div>

            <SelectField
              id="dataSource"
              label="Data source"
              value={batch.dataSource}
              onChange={(v) => setB("dataSource", v)}
              options={[
                { value: "catalog", label: "Current library" },
                { value: "new-additions", label: "New additions" },
                { value: "custom-selection", label: "Custom selection" },
                { value: "file-upload", label: "File upload" },
              ]}
            />

            {batch.dataSource === "file-upload" && (
              <FormField label="Upload file" htmlFor="fileUpload" hint="CSV or Excel">
                <Input id="fileUpload" type="file" accept=".csv,.xlsx,.xls" />
              </FormField>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <SelectField id="batchLabelType" label="Label type" value={batch.labelType} onChange={(v) => setB("labelType", v)} options={LABEL_TYPES} />
              <SelectField id="batchLabelSize" label="Label size" value={batch.labelSize} onChange={(v) => setB("labelSize", v)} options={LABEL_SIZES} />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-[13px] font-semibold">Include elements</legend>
              <div className="grid grid-cols-2 gap-3">
                <CheckField id="batchIncludeBarcode" label="Include barcode" checked={batch.includeBarcode} onChange={(v) => setB("includeBarcode", v)} />
                <CheckField id="batchIncludeQrCode" label="Include QR code" checked={batch.includeQrCode} onChange={(v) => setB("includeQrCode", v)} />
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBatch({ ...DEFAULT_BATCH })}>
                Reset
              </Button>
              <Button type="submit">Generate batch labels</Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="grid gap-4 md:grid-cols-3">
            {templates.map((t) => (
              <article key={t.name} className="rounded-[18px] bg-bb-surface p-5 shadow-e1">
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-[13px] text-bb-muted">{t.used}</p>
                <div className="mt-4">
                  <Chip icon={t.icon}>{t.note}</Chip>
                </div>
              </article>
            ))}
            <button
              type="button"
              onClick={() => toast({ title: "Coming soon", description: "Saving label templates isn't available yet." })}
              className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-bb-border p-5 text-sm font-semibold text-bb-muted hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Icon name="plus" size={28} /> Create new template
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LabelGeneratorPage;
