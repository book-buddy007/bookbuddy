'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from '@/components/ui/enhanced-card';
import { StatCard } from '@/components/ui/stat-card';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Boxes, Plus, Filter, FileDown, ImportIcon, Package, AlertTriangle, CheckCircle2 } from '@/components/ui/icons';
const ScientificCatalogSystem = (props: any) => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Scientific Classification System (Under Construction)</div>;
const InventoryHealthMonitor = (props: any) => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Inventory Health Monitor (Under Construction)</div>;
const InventoryTable = (props: any) => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Inventory Table Component (Under Construction)</div>;
export type InventoryItem = any;
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

// Mock inventory data
const mockInventory: InventoryItem[] = [
  {
    id: 1,
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    format: 'Physical',
    catalogCode: 'FIC-FIT-1925',
    status: 'Available',
    condition: 'Good',
    location: 'Main Library - Fiction Section',
    acquisitionDate: '2022-01-15',
    lastChecked: '2023-05-20'
  },
  {
    id: 2,
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780061120084',
    format: 'Physical',
    catalogCode: 'FIC-LEE-1960',
    status: 'Checked Out',
    condition: 'Good',
    location: 'Main Library - Fiction Section',
    acquisitionDate: '2021-11-10',
    lastChecked: '2023-05-20'
  },
  {
    id: 3,
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    format: 'E-Book',
    catalogCode: 'FIC-ORW-1949',
    status: 'Available',
    acquisitionDate: '2022-03-05',
    lastChecked: '2023-05-20'
  },
  {
    id: 4,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '9780141439518',
    format: 'Physical',
    catalogCode: 'FIC-AUS-1813',
    status: 'Available',
    condition: 'Fair',
    location: 'Main Library - Classics Section',
    acquisitionDate: '2020-07-22',
    lastChecked: '2023-05-20'
  },
  {
    id: 5,
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    isbn: '9780547928227',
    format: 'Physical',
    catalogCode: 'FIC-TOL-1937',
    status: 'Damaged',
    condition: 'Poor',
    location: 'Main Library - Fantasy Section',
    acquisitionDate: '2019-12-05',
    lastChecked: '2023-05-20'
  },
  {
    id: 6,
    title: 'Harry Potter and the Sorcerer\'s Stone',
    author: 'J.K. Rowling',
    isbn: '9780590353427',
    format: 'Physical',
    catalogCode: 'FIC-ROW-1997',
    status: 'Available',
    condition: 'New',
    location: 'Main Library - Fantasy Section',
    acquisitionDate: '2022-06-15',
    lastChecked: '2023-05-20'
  },
  {
    id: 7,
    title: 'The Lord of the Rings',
    author: 'J.R.R. Tolkien',
    isbn: '9780618640157',
    format: 'E-Book',
    catalogCode: 'FIC-TOL-1954',
    status: 'Available',
    acquisitionDate: '2022-02-10',
    lastChecked: '2023-05-20'
  },
  {
    id: 8,
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '9780262033848',
    format: 'Physical',
    catalogCode: 'TEC-COR-2009',
    status: 'Checked Out',
    condition: 'Good',
    location: 'Main Library - Technology Section',
    acquisitionDate: '2021-09-03',
    lastChecked: '2023-05-20'
  },
  {
    id: 9,
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    isbn: '9780553380163',
    format: 'Audiobook',
    catalogCode: 'SCI-HAW-1988',
    status: 'Available',
    acquisitionDate: '2022-04-18',
    lastChecked: '2023-05-20'
  },
  {
    id: 10,
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    isbn: '9780062316097',
    format: 'Physical',
    catalogCode: 'HIS-HAR-2011',
    status: 'Missing',
    condition: 'Good',
    location: 'Main Library - History Section',
    acquisitionDate: '2020-11-15',
    lastChecked: '2023-05-20'
  }
];

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(mockInventory);
  
  const handleStatusChange = (id: string | number, status: InventoryItem['status']) => {
    setInventoryItems(items => 
      items.map(item => 
        item.id === id ? { ...item, status } : item
      )
    );
  };
  
  const handleViewDetails = (item: InventoryItem) => {
    console.log('View details for:', item);
    // Would typically open a modal with item details
  };
  
  const handleEdit = (item: InventoryItem) => {
    console.log('Edit item:', item);
    // Would typically open an edit form/modal
  };
  
  const handlePrintLabel = (item: InventoryItem) => {
    console.log('Print label for:', item);
    // Would typically trigger label printing
  };
  
  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
          <Package className="h-10 w-10 text-blue-700 dark:text-blue-500" />
          Inventory Management
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your library inventory, monitor status, and maintain classification codes
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Items"
          value={inventoryItems.length.toString()}
          description="In library"
          icon={Package}
          iconColor="text-blue-700 dark:text-blue-500"
          iconBgColor="bg-blue-50 dark:bg-blue-900/20"
          variant="primary"
        />
        <StatCard
          title="Available"
          value={inventoryItems.filter(i => i.status === 'Available').length.toString()}
          description="Ready to borrow"
          icon={CheckCircle2}
          iconColor="text-vg-success-600"
          iconBgColor="bg-vg-success-50 dark:bg-vg-success-900/20"
          variant="success"
        />
        <StatCard
          title="Checked Out"
          value={inventoryItems.filter(i => i.status === 'Checked Out').length.toString()}
          description="Currently borrowed"
          icon={Boxes}
          iconColor="text-teal-600 dark:text-teal-500"
          iconBgColor="bg-teal-50 dark:bg-teal-900/20"
          variant="cultural"
        />
        <StatCard
          title="Issues"
          value={(inventoryItems.filter(i => i.status === 'Damaged' || i.status === 'Missing').length).toString()}
          description="Damaged or missing"
          icon={AlertTriangle}
          iconColor="text-vg-error-600"
          iconBgColor="bg-vg-error-50 dark:bg-vg-error-900/20"
          variant="error"
        />
      </div>

      <div className="flex flex-wrap gap-3 justify-between items-center">
        <div className="flex flex-wrap gap-3">
          <EnhancedButton variant="vg-primary" icon={<Plus className="h-4 w-4" />}>
            Add Item
          </EnhancedButton>
          <EnhancedButton variant="outline" icon={<Filter className="h-4 w-4" />}>
            Filter
          </EnhancedButton>
          <EnhancedButton variant="outline" icon={<ImportIcon className="h-4 w-4" />}>
            Import
          </EnhancedButton>
          <EnhancedButton variant="outline" icon={<FileDown className="h-4 w-4" />}>
            Export
          </EnhancedButton>
        </div>

        <div className="relative w-64">
          <Input
            placeholder="Search inventory..."
            className="pl-8 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md"
          />
          <Boxes className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">Library Listing</TabsTrigger>
          <TabsTrigger value="health">Inventory Health</TabsTrigger>
          <TabsTrigger value="system">Classification System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="catalog">
          <InventoryTable 
            items={inventoryItems}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
            onPrintLabel={handlePrintLabel}
          />
        </TabsContent>
        
        <TabsContent value="health">
          <InventoryHealthMonitor 
            metrics={['missing', 'damaged', 'circulating']}
            thresholds={{
              missing: { warn: 5, critical: 10 },
              damaged: { warn: 10, critical: 20 }
            }}
          />
        </TabsContent>
        
        <TabsContent value="system">
          <ScientificCatalogSystem 
            codeFormats={['GENRE-YEAR-SEQ', 'GENRE-AUTHOR-YEAR']}
            autoGenerateOnAdd={true}
          />
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Inventory Best Practices</CardTitle>
          <CardDescription>Tips for maintaining an accurate and efficient inventory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Regular Audits</h3>
            <p className="text-sm text-muted-foreground">
              Schedule full inventory audits at least twice a year, with spot checks monthly for high-circulation areas.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-1">Classification Consistency</h3>
            <p className="text-sm text-muted-foreground">
              Maintain consistent classification codes using the Scientific Classification System for easy location and retrieval.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-1">Condition Assessment</h3>
            <p className="text-sm text-muted-foreground">
              Regularly assess item condition during check-in, with a standardized scale: New, Good, Fair, Poor, or Damaged.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-1">Data Integrity</h3>
            <p className="text-sm text-muted-foreground">
              Validate inventory data regularly, ensuring all items have complete metadata and classification codes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 