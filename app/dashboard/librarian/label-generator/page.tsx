'use client';

import React, { useState } from "react";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import {
  EnhancedCard,
  EnhancedCardContent,
  EnhancedCardDescription,
  EnhancedCardHeader,
  EnhancedCardTitle,
  EnhancedCardFooter,
} from "@/components/ui/enhanced-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Printer, QrCode, Barcode, PlusCircle, Tag, FileText } from "@/components/ui/icons";

const LabelGeneratorPage = () => {
  // Single label form state
  const [singleFormData, setSingleFormData] = useState({
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
  });

  // Batch label form state
  const [batchFormData, setBatchFormData] = useState({
    dataSource: "catalog",
    fileUpload: "",
    labelType: "spine",
    labelSize: "standard",
    includeBarcode: true,
    includeQrCode: false,
  });

  // Single form handlers
  const handleSingleFormChange = (field: string, value: any) => {
    setSingleFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSingleFormReset = () => {
    setSingleFormData({
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
    });
  };

  const handleSingleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(singleFormData);
    alert("Labels prepared for printing!");
  };

  // Batch form handlers
  const handleBatchFormChange = (field: string, value: any) => {
    setBatchFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBatchFormReset = () => {
    setBatchFormData({
      dataSource: "catalog",
      fileUpload: "",
      labelType: "spine",
      labelSize: "standard",
      includeBarcode: true,
      includeQrCode: false,
    });
  };

  const handleBatchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(batchFormData);
    alert("Batch labels prepared for printing!");
  };

  // Sample label preview JSX - would be dynamically generated based on form values
  const LabelPreview = () => (
    <div className="border rounded-md p-4 w-full h-64 bg-white">
      <div className="flex flex-col h-full justify-between">
        <div>
          <p className="text-xs text-center font-bold">SAMPLE LIBRARY</p>
          <p className="text-sm text-center mt-2 font-medium">FICTION</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">ROW</p>
          <p className="text-sm">J.K. Rowling</p>
          <div className="mt-2 flex justify-center">
            <Barcode className="h-12 w-36" />
          </div>
          <p className="text-xs mt-1">123456789</p>
        </div>
        <div className="text-center text-xs">
          <p>Example Library</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
          <Tag className="h-10 w-10 text-vg-primary-600" />
          Label Generator
        </h1>
        <p className="text-muted-foreground text-lg">
          Create and print labels for your library resources
        </p>
      </div>

      <Tabs defaultValue="single" className="w-full space-y-6">
        <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
          <TabsTrigger
            value="single"
            className="data-[state=active]:text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Single Label
          </TabsTrigger>
          <TabsTrigger
            value="batch"
            className="data-[state=active]:text-white"
          >
            <Barcode className="h-4 w-4 mr-2" />
            Batch Labels
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <EnhancedCard variant="elevated">
                <EnhancedCardHeader>
                  <EnhancedCardTitle className="text-bb-accent">
                    Generate Single Label
                  </EnhancedCardTitle>
                  <EnhancedCardDescription>
                    Create a label for individual items
                  </EnhancedCardDescription>
                </EnhancedCardHeader>
                <EnhancedCardContent>
                  <form
                    onSubmit={handleSingleFormSubmit}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="labelType">Label Type</Label>
                        <Select
                          value={singleFormData.labelType}
                          onValueChange={(value) => handleSingleFormChange('labelType', value)}
                        >
                          <SelectTrigger id="labelType">
                            <SelectValue placeholder="Select label type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spine">Spine Label</SelectItem>
                            <SelectItem value="pocket">
                              Pocket Label
                            </SelectItem>
                            <SelectItem value="card">Card Label</SelectItem>
                            <SelectItem value="barcode">
                              Barcode Label
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="labelSize">Label Size</Label>
                        <Select
                          value={singleFormData.labelSize}
                          onValueChange={(value) => handleSingleFormChange('labelSize', value)}
                        >
                          <SelectTrigger id="labelSize">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">
                              Standard (1" x 1.5")
                            </SelectItem>
                            <SelectItem value="small">
                              Small (0.5" x 1")
                            </SelectItem>
                            <SelectItem value="large">
                              Large (2" x 3")
                            </SelectItem>
                            <SelectItem value="custom">
                              Custom Size
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="labelContent">Label Content (Call Number, etc.)</Label>
                      <Input
                        id="labelContent"
                        placeholder="Enter call number or scan barcode"
                        value={singleFormData.labelContent}
                        onChange={(e) => handleSingleFormChange('labelContent', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startingPosition">Starting Position</Label>
                        <Select
                          value={singleFormData.startingPosition}
                          onValueChange={(value) => handleSingleFormChange('startingPosition', value)}
                        >
                          <SelectTrigger id="startingPosition">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Position 1</SelectItem>
                            <SelectItem value="2">Position 2</SelectItem>
                            <SelectItem value="3">Position 3</SelectItem>
                            <SelectItem value="4">Position 4</SelectItem>
                            <SelectItem value="5">Position 5</SelectItem>
                            <SelectItem value="6">Position 6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="numberOfCopies">Number of Copies</Label>
                        <Input
                          id="numberOfCopies"
                          type="number"
                          min="1"
                          placeholder="1"
                          value={singleFormData.numberOfCopies}
                          onChange={(e) => handleSingleFormChange('numberOfCopies', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Include Elements</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showTitle"
                            checked={singleFormData.showTitle}
                            onCheckedChange={(checked) => handleSingleFormChange('showTitle', checked)}
                          />
                          <Label htmlFor="showTitle" className="font-normal">
                            Show Title
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showAuthor"
                            checked={singleFormData.showAuthor}
                            onCheckedChange={(checked) => handleSingleFormChange('showAuthor', checked)}
                          />
                          <Label htmlFor="showAuthor" className="font-normal">
                            Show Author
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="showCallNumber"
                            checked={singleFormData.showCallNumber}
                            onCheckedChange={(checked) => handleSingleFormChange('showCallNumber', checked)}
                          />
                          <Label htmlFor="showCallNumber" className="font-normal">
                            Show Call Number
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="includeBarcode"
                            checked={singleFormData.includeBarcode}
                            onCheckedChange={(checked) => handleSingleFormChange('includeBarcode', checked)}
                          />
                          <Label htmlFor="includeBarcode" className="font-normal">
                            Include Barcode
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="includeQrCode"
                            checked={singleFormData.includeQrCode}
                            onCheckedChange={(checked) => handleSingleFormChange('includeQrCode', checked)}
                          />
                          <Label htmlFor="includeQrCode" className="font-normal">
                            Include QR Code
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <EnhancedButton
                        type="button"
                        variant="outline"
                        onClick={handleSingleFormReset}
                      >
                        Reset
                      </EnhancedButton>
                      <EnhancedButton type="submit">Generate Label</EnhancedButton>
                    </div>
                  </form>
                </EnhancedCardContent>
              </EnhancedCard>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Label Preview</CardTitle>
                  <CardDescription>
                    Preview of your generated label
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LabelPreview />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <EnhancedButton variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Save
                  </EnhancedButton>
                  <EnhancedButton size="sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </EnhancedButton>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Label Generation</CardTitle>
              <CardDescription>
                Generate multiple labels at once from your library or a file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleBatchFormSubmit}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Select
                    value={batchFormData.dataSource}
                    onValueChange={(value) => handleBatchFormChange('dataSource', value)}
                  >
                    <SelectTrigger id="dataSource">
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="catalog">
                        Current Library
                      </SelectItem>
                      <SelectItem value="new-additions">
                        New Additions
                      </SelectItem>
                      <SelectItem value="custom-selection">
                        Custom Selection
                      </SelectItem>
                      <SelectItem value="file-upload">
                        File Upload
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {batchFormData.dataSource === "file-upload" && (
                  <div>
                    <Label htmlFor="fileUpload">Upload File</Label>
                    <Input
                      id="fileUpload"
                      type="file"
                      placeholder="Upload CSV or Excel file"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batchLabelType">Label Type</Label>
                    <Select
                      value={batchFormData.labelType}
                      onValueChange={(value) => handleBatchFormChange('labelType', value)}
                    >
                      <SelectTrigger id="batchLabelType">
                        <SelectValue placeholder="Select label type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spine">Spine Label</SelectItem>
                        <SelectItem value="pocket">Pocket Label</SelectItem>
                        <SelectItem value="card">Card Label</SelectItem>
                        <SelectItem value="barcode">
                          Barcode Label
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="batchLabelSize">Label Size</Label>
                    <Select
                      value={batchFormData.labelSize}
                      onValueChange={(value) => handleBatchFormChange('labelSize', value)}
                    >
                      <SelectTrigger id="batchLabelSize">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">
                          Standard (1" x 1.5")
                        </SelectItem>
                        <SelectItem value="small">
                          Small (0.5" x 1")
                        </SelectItem>
                        <SelectItem value="large">
                          Large (2" x 3")
                        </SelectItem>
                        <SelectItem value="custom">Custom Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Include Elements</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="batchIncludeBarcode"
                        checked={batchFormData.includeBarcode}
                        onCheckedChange={(checked) => handleBatchFormChange('includeBarcode', checked)}
                      />
                      <Label htmlFor="batchIncludeBarcode" className="font-normal">
                        Include Barcode
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="batchIncludeQrCode"
                        checked={batchFormData.includeQrCode}
                        onCheckedChange={(checked) => handleBatchFormChange('includeQrCode', checked)}
                      />
                      <Label htmlFor="batchIncludeQrCode" className="font-normal">
                        Include QR Code
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <EnhancedButton
                    type="button"
                    variant="outline"
                    onClick={handleBatchFormReset}
                  >
                    Reset
                  </EnhancedButton>
                  <EnhancedButton type="submit">Generate Batch Labels</EnhancedButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Label Templates</CardTitle>
              <CardDescription>
                Manage your saved label templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border hover:border-primary cursor-pointer">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">Standard Spine Label</CardTitle>
                    <CardDescription>Last used 2 days ago</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-center space-x-2">
                      <Barcode className="h-4 w-4" />
                      <span className="text-xs">With barcode</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border hover:border-primary cursor-pointer">
                  <CardHeader className="p-4">
                    <CardTitle className="text-base">QR Resource Label</CardTitle>
                    <CardDescription>Last used 1 week ago</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-center space-x-2">
                      <QrCode className="h-4 w-4" />
                      <span className="text-xs">With QR code</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-dashed hover:border-primary cursor-pointer flex flex-col items-center justify-center p-6">
                  <CardContent className="flex flex-col items-center justify-center p-0">
                    <EnhancedButton variant="ghost" className="h-auto p-0">
                      <PlusCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <span>Create New Template</span>
                    </EnhancedButton>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LabelGeneratorPage; 