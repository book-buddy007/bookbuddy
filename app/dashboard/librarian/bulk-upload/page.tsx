'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from '@/components/ui/enhanced-card';
// Placeholder components for missing imports
const BookUpload = () => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Book Upload Component (Under Construction)</div>;
const StudentUpload = () => <div className="p-8 text-center text-muted-foreground bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed">Student Upload Component (Under Construction)</div>;
import { FileText, Users, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from '@/components/ui/icons';

export default function BulkUploadPage() {
  return (
    <div className="space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
          <Upload className="h-10 w-10 text-blue-700 dark:text-blue-500" />
          Bulk Upload
        </h1>
        <p className="text-muted-foreground text-lg">
          Import multiple books or student records using Excel spreadsheets
        </p>
      </div>

      <Tabs defaultValue="books" className="space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="books"
            className="flex items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            <FileText className="mr-2 h-4 w-4" />
            Books
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="flex items-center data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            <Users className="mr-2 h-4 w-4" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <BookUpload />
        </TabsContent>

        <TabsContent value="students">
          <StudentUpload />
        </TabsContent>
      </Tabs>

      <EnhancedCard variant="elevated">
        <EnhancedCardHeader>
          <EnhancedCardTitle className="flex items-center gap-2 text-bb-accent">
            <FileSpreadsheet className="h-5 w-5 text-blue-700 dark:text-blue-500" />
            Bulk Upload Guidelines
          </EnhancedCardTitle>
          <EnhancedCardDescription>Important information for successful bulk operations</EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="space-y-4">
          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-vg-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1 text-vg-success-700 dark:text-vg-success-400">Data Quality</h3>
              <p className="text-sm text-muted-foreground">
                Ensure your data is clean and complete before uploading. Missing or invalid data may cause your upload to fail.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1 text-blue-700 dark:text-blue-400">Spreadsheet Formatting</h3>
              <p className="text-sm text-muted-foreground">
                Always use the provided templates. Changing column order or names will cause validation errors.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-vg-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1 text-vg-warning-700 dark:text-vg-warning-400">Large Uploads</h3>
              <p className="text-sm text-muted-foreground">
                For very large datasets (1000+ records), consider splitting into multiple files to improve processing speed.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1 text-teal-700 dark:text-teal-400">Duplicate Management</h3>
              <p className="text-sm text-muted-foreground">
                Records with matching unique identifiers (ISBN, Student ID) will update existing entries rather than create duplicates.
              </p>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
  );
}