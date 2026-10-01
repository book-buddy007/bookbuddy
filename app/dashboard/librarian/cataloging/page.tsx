'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BookFormModal } from "@/components/catalog/BookFormModal";

const CatalogingPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      const { submitToGlobal, ...bookData } = data;
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
          toast({
            title: "Book entry created",
            description: "It couldn't be submitted to the Global Library. You might not have Publisher permissions.",
            variant: "destructive",
          });
          setIsModalOpen(false);
          return;
        }
      }

      toast({
        title: submitToGlobal ? "Submitted for global approval" : "Book entry created",
        description: submitToGlobal ? "The book entry was created and sent for Global Approval." : "The book entry was created successfully.",
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating book:', error);
      toast({ title: "Couldn't create the book entry", description: "An error occurred. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Book entry"
        description="Add and manage the resources in your library."
        actions={<Chip icon="info">Import not available yet</Chip>}
      />

      <Tabs defaultValue="add-item" className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="add-item">Add new item</TabsTrigger>
          <TabsTrigger value="batch-edit">Batch edit</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="add-item">
          <EmptyState
            icon="plus"
            title="Create a new book entry"
            description="Use the schema-compliant book entry wizard to add books, e-books, and audiobooks to the library system."
            action={
              <Button onClick={() => setIsModalOpen(true)}>
                <Icon name="plus" size={18} /> Open book entry wizard
              </Button>
            }
          />
          <BookFormModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            title="Create Book Entry"
            onSubmit={handleSubmit}
          />
        </TabsContent>

        <TabsContent value="batch-edit">
          <EmptyState icon="edit" title="Batch editing is coming soon" description="You'll be able to edit multiple book entries at once." />
        </TabsContent>

        <TabsContent value="templates">
          <EmptyState icon="copy" title="Templates are coming soon" description="Create and manage reusable book entry templates." />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CatalogingPage;
