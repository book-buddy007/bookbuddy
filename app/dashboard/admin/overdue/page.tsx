'use client';

import { useState, useEffect } from 'react';
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { LoadingSkeleton } from "@/components/admin/shared/Skeleton";
import { useAdminState } from "@/hooks/use-admin-state";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Clock, Mail, AlertCircle, DollarSign, Send,
  RefreshCw, UserRound, BookOpen, TrendingUp
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

// Mock overdue items
const mockOverdueItems = [
  {
    id: 1,
    title: "The Great Gatsby",
    student: "Emily Davis",
    email: "e.davis@example.edu",
    dueDate: "2023-04-10",
    daysOverdue: 15,
    fine: 7.50,
    remindersSent: 2,
    lastReminder: "2023-04-17"
  },
  {
    id: 2,
    title: "To Kill a Mockingbird",
    student: "James Wilson",
    email: "jwilson@example.edu",
    dueDate: "2023-04-15",
    daysOverdue: 10,
    fine: 5.00,
    remindersSent: 1,
    lastReminder: "2023-04-18"
  },
  {
    id: 3,
    title: "1984",
    student: "Sophia Martinez",
    email: "smartinez@example.edu",
    dueDate: "2023-04-18",
    daysOverdue: 7,
    fine: 3.50,
    remindersSent: 1,
    lastReminder: "2023-04-20"
  },
  {
    id: 4,
    title: "Pride and Prejudice",
    student: "Alex Johnson",
    email: "ajohnson@example.edu",
    dueDate: "2023-04-20",
    daysOverdue: 5,
    fine: 2.50,
    remindersSent: 0,
    lastReminder: null
  },
  {
    id: 5,
    title: "The Catcher in the Rye",
    student: "Lisa Wang",
    email: "lwang@example.edu",
    dueDate: "2023-04-21",
    daysOverdue: 4,
    fine: 2.00,
    remindersSent: 0,
    lastReminder: null
  }
];

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Overdue Status Badge Component
const OverdueBadge = ({ days }: { days: number }) => {
  if (days <= 3) {
    return <Badge variant="outline">Recent</Badge>;
  } else if (days <= 7) {
    return <Badge variant="secondary">Moderate</Badge>;
  } else if (days <= 14) {
    return <Badge variant="destructive" className="opacity-70">Significant</Badge>;
  } else {
    return <Badge variant="destructive">Severe</Badge>;
  }
};

export default function OverduePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("daysOverdue");
  const [overdueItems, setOverdueItems] = useState<typeof mockOverdueItems>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const { toast } = useToast();
  const { policies = { dailyRate: 0.50, maxFine: 20, gracePeriod: 3, fines: { enabled: true } } } = useAdminState();

  // Stats for the dashboard
  const totalOverdue = overdueItems.length;
  const totalFines = overdueItems.reduce((sum, item) => sum + item.fine, 0);
  const avgDaysOverdue = Math.round(
    overdueItems.reduce((sum, item) => sum + item.daysOverdue, 0) / totalOverdue
  );
  const noReminderCount = overdueItems.filter(item => item.remindersSent === 0).length;

  // Simulate loading data from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setOverdueItems(mockOverdueItems);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Filter items based on active tab
  const getFilteredItems = () => {
    switch (activeTab) {
      case "recent":
        return overdueItems.filter(item => item.daysOverdue <= 7);
      case "severe":
        return overdueItems.filter(item => item.daysOverdue > 7);
      case "noreminder":
        return overdueItems.filter(item => item.remindersSent === 0);
      default:
        return overdueItems;
    }
  };

  const filteredItems = getFilteredItems();

  // Toggle selection of an item
  const toggleSelection = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Toggle selection of all visible items
  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  // Send reminders to selected items
  const sendReminders = () => {
    setIsSendingReminders(true);
    
    // Simulate API call
    setTimeout(() => {
      // Update the items with new reminder count
      const updatedItems = overdueItems.map(item => {
        if (selectedItems.includes(item.id)) {
          return {
            ...item,
            remindersSent: item.remindersSent + 1,
            lastReminder: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      });
      
      setOverdueItems(updatedItems);
      setSelectedItems([]);
      setIsSendingReminders(false);
      setReminderDialogOpen(false);
      
      toast({
        title: "Reminders Sent",
        description: `Successfully sent reminders to ${selectedItems.length} students.`
      });
    }, 1500);
  };

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
          <AlertCircle className="h-10 w-10 text-vg-error-600" />
          Overdue Management
        </h1>
        <p className="text-muted-foreground text-lg">
          Track and manage overdue items and send reminders
        </p>
      </div>

      <LoadingSkeleton loading={isLoading}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Overdue Items"
            value={totalOverdue.toString()}
            description="Across all borrowers"
            icon={Clock}
            iconColor="text-vg-error-600"
            iconBgColor="bg-vg-error-50 dark:bg-vg-error-900/20"
            variant="error"
          />

          <StatCard
            title="Total Fines Accrued"
            value={formatCurrency(totalFines)}
            description="Outstanding fines"
            icon={DollarSign}
            iconColor="text-vg-warning-600"
            iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
            variant="warning"
          />

          <StatCard
            title="Average Days Overdue"
            value={avgDaysOverdue.toString()}
            description="Days past due date"
            icon={AlertCircle}
            iconColor="text-vg-warning-600"
            iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
            variant="warning"
          />

          <StatCard
            title="No Reminders Sent"
            value={noReminderCount.toString()}
            description="Items needing attention"
            icon={Mail}
            iconColor="text-blue-700 dark:text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-900/20"
            variant="primary"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="all">All Overdue</TabsTrigger>
              <TabsTrigger value="recent">Recent (≤7 days)</TabsTrigger>
              <TabsTrigger value="severe">Severe (&gt;7 days)</TabsTrigger>
              <TabsTrigger value="noreminder">No Reminders</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daysOverdue">Days Overdue</SelectItem>
                <SelectItem value="fine">Fine Amount</SelectItem>
                <SelectItem value="borrower">Borrower Name</SelectItem>
                <SelectItem value="title">Book Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label 
                  htmlFor="select-all" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All
                </label>
                
                {selectedItems.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({selectedItems.length} selected)
                  </span>
                )}
              </div>
              
              <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                <DialogTrigger asChild>
                  <EnhancedButton
                    disabled={selectedItems.length === 0}
                    size="sm"
                    onClick={() => setReminderDialogOpen(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminders
                  </EnhancedButton>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Overdue Reminders</DialogTitle>
                    <DialogDescription>
                      This will send email reminders to {selectedItems.length} student(s) about their overdue items.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="mb-2 font-medium">Selected items:</p>
                    <ul className="space-y-1 text-sm">
                      {overdueItems
                        .filter(item => selectedItems.includes(item.id))
                        .map(item => (
                          <li key={item.id} className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                            {item.title} ({item.student})
                          </li>
                        ))}
                    </ul>
                  </div>
                  <DialogFooter>
                    <EnhancedButton variant="outline" onClick={() => setReminderDialogOpen(false)}>
                      Cancel
                    </EnhancedButton>
                    <EnhancedButton onClick={sendReminders} disabled={isSendingReminders}>
                      {isSendingReminders ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reminders
                        </>
                      )}
                    </EnhancedButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead>Reminders</TableHead>
                    <TableHead>Last Reminder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">
                        No overdue items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <UserRound className="h-4 w-4 mr-2 text-muted-foreground" />
                            {item.student}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.email}</div>
                        </TableCell>
                        <TableCell>{formatDate(item.dueDate)}</TableCell>
                        <TableCell>{item.daysOverdue}</TableCell>
                        <TableCell>
                          <OverdueBadge days={item.daysOverdue} />
                        </TableCell>
                        <TableCell>{formatCurrency(item.fine)}</TableCell>
                        <TableCell>{item.remindersSent}</TableCell>
                        <TableCell>{formatDate(item.lastReminder)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </LoadingSkeleton>
    </div>
  );
} 