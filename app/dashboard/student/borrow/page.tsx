'use client';

import { useState } from "react";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle, EnhancedCardDescription } from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Search, BookPlus, Clock, AlertTriangle, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import adminStyles from "@/app/admin.module.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BorrowPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priority, setPriority] = useState("all");

  // Mock data - will be replaced with API calls
  const borrowRequests = [
    {
      id: "BR1",
      title: "The Catcher in the Rye",
      requestDate: "June 1, 2023",
      status: "Pending",
      priority: "Normal",
      notes: "Required for Literature assignment",
    },
    {
      id: "BR2",
      title: "The Alchemist",
      requestDate: "June 2, 2023",
      status: "Approved",
      priority: "High",
      notes: "For classroom reading",
    },
  ];

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <BookPlus className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            Borrow Requests
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Request new books and track your requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EnhancedButton
            size="lg"
            className="!bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-700 hover:!to-indigo-600 !text-white shadow-lg hover:shadow-xl border-transparent"
          >
            <BookPlus className="h-5 w-5 mr-2" /> New Request
          </EnhancedButton>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Total Requests"
          value={borrowRequests.length.toString()}
          description="All time requests"
          icon={BookPlus}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
          variant="primary"
        />
        <StatCard
          title="Pending Requests"
          value={borrowRequests.filter(r => r.status === "Pending").length.toString()}
          description="Awaiting librarian approval"
          icon={Clock}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-900/20"
          variant="warning"
        />
        <StatCard
          title="Approved Requests"
          value={borrowRequests.filter(r => r.status === "Approved").length.toString()}
          description="Ready for pickup"
          icon={CheckCircle2}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-900/20"
          variant="success"
        />
      </div>

      {/* Table Section */}
      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative pb-2 z-10">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Request History
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-600 dark:text-slate-400">
            Track the status of your borrow requests
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="search"
                placeholder="Search requests..."
                className="pl-12 h-11 rounded-lg border-indigo-200/40 dark:border-indigo-900/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[180px] h-11 rounded-lg border-indigo-200/40 dark:border-indigo-900/30">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="normal">Normal Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-indigo-200/40 dark:border-indigo-900/30 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-indigo-50/50 dark:bg-indigo-900/20">
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Title</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Request Date</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Priority</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Status</TableHead>
                  <TableHead className="font-semibold text-indigo-900 dark:text-indigo-100">Notes</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
                  >
                    <TableCell className="font-medium whitespace-nowrap text-slate-900 dark:text-white">
                      {request.title}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {request.requestDate}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={request.priority === "High" ? "destructive" : "secondary"}
                        className={
                          request.priority === "High"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }
                      >
                        {request.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={request.status === "Pending" ? "outline" : "default"}
                        className={
                          request.status === "Approved"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                      {request.notes}
                    </TableCell>
                    <TableCell className="text-right">
                      <EnhancedButton size="sm" className="bg-white/50 hover:bg-white/80 text-indigo-700 border-indigo-200">
                        View Details
                      </EnhancedButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
  );
}