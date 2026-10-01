import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, Server, Activity, Cpu } from "@/components/ui/icons";

export function SystemHealthWidgets() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Server className="mr-2 h-4 w-4" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Server Uptime</span>
              <span className="text-sm font-medium">99.9%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full" style={{ width: '99.9%' }}></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm">Database Health</span>
              <span className="text-sm font-medium">Optimal</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full" style={{ width: '100%' }}></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm">Storage Usage</span>
              <span className="text-sm font-medium">36.2%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '36.2%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <Activity className="mr-2 h-4 w-4" />
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">CPU Usage</span>
              <span className="text-sm font-medium">24%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '24%' }}></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm">Memory Usage</span>
              <span className="text-sm font-medium">42%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm">API Response Time</span>
              <span className="text-sm font-medium">120ms</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full" style={{ width: '20%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 