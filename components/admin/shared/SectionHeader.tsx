import { Button } from "@/components/ui/button";

interface Action {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: Action[];
}

export function SectionHeader({ 
  title, 
  description, 
  actions = [] 
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action, i) => (
            <Button 
              key={i} 
              onClick={action.onClick}
              variant={action.variant || "default"}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
} 