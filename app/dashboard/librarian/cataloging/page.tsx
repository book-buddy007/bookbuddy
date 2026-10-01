'use client';

import React, { useState } from "react";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardDescription,
  EnhancedCardHeader,
  EnhancedCardTitle,
} from "@/components/ui/enhanced-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PlusCircle, FileEdit, FileText, BookPlus, Upload } from "lucide-react";
import { BookFormModal } from "@/components/catalog/BookFormModal";

const CatalogingPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <BookPlus className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            Book Entry
          </h1>
          <p className="text-muted-foreground text-lg">
            Add and manage the resources in your library
          </p>
        </div>
        <EnhancedButton variant="outline" icon={<Upload className="h-4 w-4" />}>
          Import Library Data
        </EnhancedButton>
      </div>

      <Tabs defaultValue="add-item" className="w-full space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="add-item"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Item
          </TabsTrigger>
          <TabsTrigger
            value="batch-edit"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Batch Edit
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-item" className="space-y-6">
          <EnhancedCard variant="elevated">
            <EnhancedCardHeader>
              <EnhancedCardTitle className="bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                Add New Book Entry
              </EnhancedCardTitle>
              <EnhancedCardDescription>
                Enter the details for the new resource
              </EnhancedCardDescription>
            </EnhancedCardHeader>
            <EnhancedCardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <BookPlus className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-2xl font-medium mb-2">Create a New Book Entry</h3>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Use our advanced schema-compliant book entry wizard to easily add books, e-books, and audiobooks to the library system.
                </p>
                <EnhancedButton variant="vg-primary" onClick={() => setIsModalOpen(true)}>
                  Open Book Entry Wizard
                </EnhancedButton>
                <BookFormModal 
                  open={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  title="Create Book Entry"
                  onSubmit={async (data) => {
                    try {
                      const { submitToGlobal, ...bookData } = data as any;
                      // Map frontend form data to the backend CreateBookDto structure
                      const payload = {
                        ...bookData,
                        formats: [
                          { format: bookData.format }
                        ]
                      };

                      const response = await fetch('/api/v1/books', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                      });

                      if (!response.ok) {
                        throw new Error('Failed to create book entry');
                      }

                      const createdBook = await response.json();

                      // If user requested global catalog inclusion
                      if (submitToGlobal && createdBook?.id) {
                        const globalRes = await fetch(`/api/v1/books/${createdBook.id}/submit-global`, {
                          method: 'POST',
                        });
                        if (!globalRes.ok) {
                           console.warn("Failed to submit to global library, but book was created.");
                           alert("Book entry created, but failed to submit to Global Library. You might not have Publisher permissions.");
                           setIsModalOpen(false);
                           return;
                        }
                      }

                      alert(submitToGlobal ? "Book entry created and submitted for Global Approval!" : "Book entry created successfully!");
                      setIsModalOpen(false);
                    } catch (error) {
                      console.error('Error creating book:', error);
                      alert("An error occurred while creating the book entry.");
                    }
                  }}
                />
              </div>
            </EnhancedCardContent>
          </EnhancedCard>
        </TabsContent>

        <TabsContent value="batch-edit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Edit Book Entries</CardTitle>
              <CardDescription>
                Edit multiple book entries at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Batch editing functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Book Templates</CardTitle>
              <CardDescription>
                Create and manage book entry templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-dashed flex flex-col items-center justify-center p-6 h-40 hover:border-primary/50 cursor-pointer">
                  <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="font-medium">Create New Template</p>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CatalogingPage; 