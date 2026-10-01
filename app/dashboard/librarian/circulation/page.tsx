'use client';

import React, { useState } from "react";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { StatCard } from "@/components/ui/stat-card";
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardDescription,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardFooter,
} from "@/components/ui/enhanced-card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, BookCopy, BookOpen, RotateCcw, Calendar, RefreshCw, AlertCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// Simple date formatter to replace date-fns
const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${m} ${d}, ${y}`;
};

// Mock circulation data
const mockCirculationItems = [
  {
    id: "1",
    title: "To Kill a Mockingbird",
    borrower: "Alex Johnson",
    borrowerType: "Student",
    borrowDate: new Date(2023, 8, 15),
    dueDate: new Date(2023, 9, 15),
    status: "overdue",
    checkedOutBy: "Sarah Librarian",
  },
  {
    id: "2",
    title: "1984",
    borrower: "Jamie Smith",
    borrowerType: "Teacher",
    borrowDate: new Date(2023, 8, 20),
    dueDate: new Date(2023, 9, 20),
    status: "borrowed",
    checkedOutBy: "Sarah Librarian",
  },
  {
    id: "3",
    title: "The Great Gatsby",
    borrower: "Chris Wong",
    borrowerType: "Student",
    borrowDate: new Date(2023, 8, 25),
    dueDate: new Date(2023, 9, 25),
    status: "borrowed",
    checkedOutBy: "Mark Librarian",
  },
  {
    id: "4",
    title: "Pride and Prejudice",
    borrower: "Taylor Reed",
    borrowerType: "Student",
    borrowDate: new Date(2023, 8, 10),
    dueDate: new Date(2023, 9, 10),
    status: "overdue",
    checkedOutBy: "Sarah Librarian",
  },
  {
    id: "5",
    title: "The Hobbit",
    borrower: "Jordan Lee",
    borrowerType: "Teacher",
    borrowDate: new Date(2023, 8, 5),
    dueDate: new Date(2023, 9, 5),
    status: "returned",
    returnDate: new Date(2023, 9, 2),
    checkedOutBy: "Mark Librarian",
    checkedInBy: "Sarah Librarian",
  },
];

// Mock recent returns
const mockReturns = [
  {
    id: "5",
    title: "The Hobbit",
    borrower: "Jordan Lee",
    borrowerType: "Teacher",
    returnDate: new Date(2023, 9, 2),
    status: "good",
  },
  {
    id: "6",
    title: "Lord of the Flies",
    borrower: "Riley Taylor",
    borrowerType: "Student",
    returnDate: new Date(2023, 9, 1),
    status: "damaged",
  },
  {
    id: "7",
    title: "Brave New World",
    borrower: "Casey Martin",
    borrowerType: "Teacher",
    returnDate: new Date(2023, 8, 30),
    status: "good",
  },
];

// Mock borrow requests data
const mockBorrowRequests = [
  {
    id: "BR1",
    title: "The Catcher in the Rye",
    requester: "David Miller",
    requesterType: "Student",
    requestDate: new Date(2023, 9, 1),
    status: "PENDING",
    priority: "normal",
    notes: "Required for Literature assignment",
  },
  {
    id: "BR2",
    title: "The Alchemist",
    requester: "Sarah Chen",
    requesterType: "Teacher",
    requestDate: new Date(2023, 9, 2),
    status: "PENDING",
    priority: "high",
    notes: "For classroom reading",
  },
  {
    id: "BR3",
    title: "The Silent Patient",
    requester: "Michael Brown",
    requesterType: "Student",
    requestDate: new Date(2023, 9, 2),
    status: "APPROVED",
    priority: "normal",
    notes: "Personal reading",
  },
  {
    id: "BR4",
    title: "Educated",
    requester: "Emma Wilson",
    requesterType: "Student",
    requestDate: new Date(2023, 9, 3),
    status: "REJECTED",
    priority: "normal",
    notes: "Book currently unavailable",
  },
];

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: { [key: string]: { color: string; label: string } } = {
    borrowed: { color: "bg-blue-100 text-blue-800", label: "Borrowed" },
    overdue: { color: "bg-red-100 text-red-800", label: "Overdue" },
    returned: { color: "bg-green-100 text-green-800", label: "Returned" },
    reserved: { color: "bg-purple-100 text-purple-800", label: "Reserved" },
    damaged: { color: "bg-yellow-100 text-yellow-800", label: "Damaged" },
    good: { color: "bg-green-100 text-green-800", label: "Good" },
  };

  const { color, label } = statusMap[status] || {
    color: "bg-gray-100 text-gray-800",
    label: status,
  };

  return <Badge className={color}>{label}</Badge>;
};

const CirculationPage = () => {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const handleApproveRequest = (requestId: string) => {
    // TODO: Implement approve request logic
    console.log(`Approving request ${requestId}`);
  };

  const handleRejectRequest = (requestId: string) => {
    // TODO: Implement reject request logic
    console.log(`Rejecting request ${requestId}`);
  };

  return (
    <div className="p-3 md:p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
            <RefreshCw className="h-8 w-8 md:h-10 md:w-10 text-blue-700 dark:text-blue-500" />
            Circulation
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Manage book check-out, returns, and reservations
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <EnhancedButton variant="outline" icon={<Calendar className="h-4 w-4" />}>
            Due Today (3)
          </EnhancedButton>
          <EnhancedButton variant="vg-primary" icon={<BookCopy className="h-4 w-4" />}>
            Check Out
          </EnhancedButton>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          title="Currently Borrowed"
          value={mockCirculationItems.filter(i => i.status === 'borrowed').length.toString()}
          description="Active checkouts"
          icon={BookOpen}
          iconColor="text-blue-700 dark:text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          variant="primary"
        />
        <StatCard
          title="Overdue Items"
          value={mockCirculationItems.filter(i => i.status === 'overdue').length.toString()}
          description="Require attention"
          icon={AlertCircle}
          iconColor="text-vg-error-600"
          iconBgColor="bg-vg-error-50 dark:bg-vg-error-900/20"
          variant="error"
        />
        <StatCard
          title="Recent Returns"
          value={mockReturns.length.toString()}
          description="Last 7 days"
          icon={RotateCcw}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
        />
        <StatCard
          title="Pending Requests"
          value={mockBorrowRequests.filter(r => r.status === 'PENDING').length.toString()}
          description="Awaiting approval"
          icon={Calendar}
          iconColor="text-vg-warning-600"
          iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
          variant="warning"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by title, borrower, or ID..."
            className="pl-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md"
          />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full sm:w-[180px] bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="borrowed">Borrowed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="overflow-x-auto scrollbar-hide w-full justify-start">
          <TabsTrigger value="current">Current Loans</TabsTrigger>
          <TabsTrigger value="returns">Recent Returns</TabsTrigger>
          <TabsTrigger value="history">Circulation History</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="borrow-requests">Borrow Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Current Loans and Overdue Items</CardTitle>
              <CardDescription>
                Books that are currently checked out from the library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Borrow Date
                    </TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCirculationItems
                    .filter((item) => item.status !== "returned")
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>
                          {item.borrower}
                          <div className="text-xs text-muted-foreground">
                            {item.borrowerType}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(item.borrowDate)}
                        </TableCell>
                        <TableCell>
                          {formatDate(item.dueDate)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              Renew
                            </Button>
                            <Button size="sm">
                              <BookOpen className="h-4 w-4" />
                              Return
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {mockCirculationItems.filter(item => item.status !== "returned").length} items
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent Returns</CardTitle>
              <CardDescription>
                Recently returned items and their condition status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockReturns.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        {item.borrower}
                        <div className="text-xs text-muted-foreground">
                          {item.borrowerType}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(item.returnDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Check Out Again
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Circulation History</CardTitle>
              <CardDescription>
                Complete history of check-outs and returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                <Input
                  type="date"
                  className="w-full sm:w-auto"
                  placeholder="Start date"
                />
                <span className="text-center">to</span>
                <Input
                  type="date"
                  className="w-full sm:w-auto"
                  placeholder="End date"
                />
                <Button variant="outline">Filter</Button>
              </div>
              <div className="text-center py-8 text-muted-foreground">
                Select a date range to view circulation history
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Reservations</CardTitle>
              <CardDescription>
                Books that have been reserved by patrons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No current reservations
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrow-requests" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Borrow Requests</CardTitle>
              <CardDescription>
                Manage new borrow requests from library users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="normal">Normal Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="hidden md:table-cell">Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBorrowRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.title}</TableCell>
                      <TableCell>
                        {request.requester}
                        <div className="text-xs text-muted-foreground">
                          {request.requesterType}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(request.requestDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={request.priority === "high" ? "destructive" : "default"}
                        >
                          {request.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {request.status === "PENDING" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveRequest(request.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectRequest(request.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {request.status === "APPROVED" && (
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          )}
                          {request.status === "REJECTED" && (
                            <Button variant="outline" size="sm">
                              View Reason
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Check-Out</CardTitle>
          <CardDescription>
            Quickly check out an item to a borrower
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Item Barcode / ID
              </label>
              <Input placeholder="Scan or enter item barcode" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Borrower ID
              </label>
              <Input placeholder="Scan or enter borrower ID" />
            </div>
            <div className="flex items-end">
              <Button className="w-full">Check Out Item</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CirculationPage;