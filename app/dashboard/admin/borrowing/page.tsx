'use client';

import { useState, useEffect } from 'react';
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { LoadingSkeleton } from "@/components/admin/shared/Skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminState, Policies } from "@/hooks/use-admin-state";
import { Save, Calculator, AlertCircle, BookOpen, Settings } from "@/components/ui/icons";
import { useToast } from "@/components/ui/use-toast";

type MaterialType = 'book' | 'ebook' | 'audiobook';

const PolicySectionAccordion = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode 
}) => {
  return (
    <AccordionItem value={title.toLowerCase()}>
      <AccordionTrigger className="text-lg font-medium">{title}</AccordionTrigger>
      <AccordionContent className="pt-4 pb-2 px-2">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
};

const RateCalculator = ({ 
  dailyRate, 
  days, 
  gracePeriod, 
  maxFine 
}: { 
  dailyRate: number; 
  days: number; 
  gracePeriod: number; 
  maxFine: number 
}) => {
  const calculateFine = () => {
    if (days <= gracePeriod) return 0;
    const fine = (days - gracePeriod) * dailyRate;
    return Math.min(fine, maxFine);
  };

  return (
    <EnhancedCard variant="glass" className="mt-4">
      <EnhancedCardHeader className="pb-2">
        <EnhancedCardTitle className="text-sm flex items-center gap-2 bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
          <Calculator className="w-4 h-4 text-blue-700 dark:text-blue-500" />
          Fine Calculator
        </EnhancedCardTitle>
      </EnhancedCardHeader>
      <EnhancedCardContent>
        <div className="text-sm space-y-1">
          <p>Days overdue: <strong className="text-blue-700 dark:text-blue-500">{days}</strong></p>
          <p>Grace period: <strong className="text-vg-success-600">{gracePeriod} days</strong></p>
          <p>Daily rate: <strong className="text-teal-600 dark:text-teal-500">${dailyRate.toFixed(2)}</strong></p>
          <p>Calculated fine: <strong className="text-vg-error-600">${calculateFine().toFixed(2)}</strong></p>
          {calculateFine() === maxFine && (
            <p className="text-vg-warning-600 flex items-center mt-2 font-medium">
              <AlertCircle className="w-3 h-3 mr-1" />
              Max fine limit reached
            </p>
          )}
        </div>
      </EnhancedCardContent>
    </EnhancedCard>
  );
};

const ComplianceChecker = ({ policies }: { policies: Policies }) => {
  const checkCompliance = () => {
    const issues = [];
    
    if (policies.limits.student <= 0) {
      issues.push("Student book limit should be greater than 0");
    }
    
    if (policies.limits.teacher <= 0) {
      issues.push("Teacher book limit should be greater than 0");
    }
    
    if (policies.fines.dailyRate <= 0) {
      issues.push("Daily fine rate should be greater than 0");
    }
    
    if (policies.periods.book <= 0 || policies.periods.ebook <= 0 || policies.periods.audiobook <= 0) {
      issues.push("Borrowing periods should be greater than 0");
    }
    
    return issues;
  };
  
  const issues = checkCompliance();
  
  if (issues.length === 0) {
    return (
      <div className="bg-vg-success-50 dark:bg-vg-success-900/20 text-vg-success-700 dark:text-vg-success-400 p-4 rounded-vg-lg mt-4 text-sm border border-vg-success-200 dark:border-vg-success-800 animate-vg-fade-in">
        <p className="font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          All policies are compliant
        </p>
      </div>
    );
  }

  return (
    <div className="bg-vg-warning-50 dark:bg-vg-warning-900/20 text-vg-warning-700 dark:text-vg-warning-400 p-4 rounded-vg-lg mt-4 text-sm border border-vg-warning-200 dark:border-vg-warning-800 animate-vg-fade-in">
      <p className="font-semibold mb-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Policy compliance issues:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        {issues.map((issue, index) => (
          <li key={index}>{issue}</li>
        ))}
      </ul>
    </div>
  );
};

export default function BorrowingPage() {
  const { policies, setPolicies } = useAdminState();
  const { toast } = useToast();
  const [localPolicies, setLocalPolicies] = useState<Policies>(policies);
  const [isLoading, setIsLoading] = useState(true);
  const [daysOverdue, setDaysOverdue] = useState(5);

  // Simulate loading policies from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (
    section: keyof Policies, 
    field: string, 
    value: string
  ) => {
    const numericValue = parseFloat(value);
    
    if (!isNaN(numericValue)) {
      setLocalPolicies({
        ...localPolicies,
        [section]: {
          ...localPolicies[section as keyof Policies],
          [field]: numericValue
        }
      });
    }
  };

  const handleSave = () => {
    setPolicies(localPolicies);
    toast({
      title: "Policies Updated",
      description: "Your policy changes have been saved successfully."
    });
  };

  return (
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-10 w-10 text-blue-700 dark:text-blue-500" />
            Borrowing Policies
          </h1>
          <p className="text-muted-foreground text-lg">
            Configure borrowing limits, fines, and periods
          </p>
        </div>
        <EnhancedButton
          onClick={handleSave}
          variant="vg-primary"
          icon={<Save className="h-4 w-4" />}
        >
          Save Changes
        </EnhancedButton>
      </div>

      <LoadingSkeleton loading={isLoading}>
        <EnhancedCard variant="elevated">
          <EnhancedCardContent className="p-6">
            <Accordion type="single" collapsible defaultValue="limits">
              <PolicySectionAccordion title="Borrowing Limits">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="student-limit">Student Book Limit</Label>
                    <Input 
                      id="student-limit" 
                      type="number" 
                      value={localPolicies.limits.student} 
                      onChange={(e) => handleInputChange('limits', 'student', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum number of books a student can borrow at once
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="teacher-limit">Teacher Book Limit</Label>
                    <Input 
                      id="teacher-limit" 
                      type="number" 
                      value={localPolicies.limits.teacher} 
                      onChange={(e) => handleInputChange('limits', 'teacher', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum number of books a teacher can borrow at once
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="renewal-limit">Maximum Renewals</Label>
                    <Input 
                      id="renewal-limit" 
                      type="number" 
                      value={localPolicies.limits.maxRenewals} 
                      onChange={(e) => handleInputChange('limits', 'maxRenewals', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum number of times a book can be renewed
                    </p>
                  </div>
                </div>
              </PolicySectionAccordion>
              
              <PolicySectionAccordion title="Fine Rates">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="daily-rate">Daily Fine Rate ($)</Label>
                    <Input 
                      id="daily-rate" 
                      type="number" 
                      step="0.01" 
                      value={localPolicies.fines.dailyRate} 
                      onChange={(e) => handleInputChange('fines', 'dailyRate', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Fine charged per day for overdue items
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="grace-period">Grace Period (days)</Label>
                    <Input 
                      id="grace-period" 
                      type="number" 
                      value={localPolicies.fines.gracePeriod} 
                      onChange={(e) => handleInputChange('fines', 'gracePeriod', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Days before fines begin to accrue
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="max-fine">Maximum Fine ($)</Label>
                    <Input 
                      id="max-fine" 
                      type="number" 
                      step="0.01" 
                      value={localPolicies.fines.maxFine} 
                      onChange={(e) => handleInputChange('fines', 'maxFine', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Maximum fine amount per item
                    </p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Label htmlFor="days-overdue">Simulate days overdue:</Label>
                  <Input 
                    id="days-overdue" 
                    type="range" 
                    min="0" 
                    max="30" 
                    value={daysOverdue} 
                    onChange={(e) => setDaysOverdue(parseInt(e.target.value))}
                    className="mt-2"
                  />
                  <p className="text-sm text-center mt-1">{daysOverdue} days</p>
                </div>
                
                <RateCalculator 
                  dailyRate={localPolicies.fines.dailyRate} 
                  days={daysOverdue} 
                  gracePeriod={localPolicies.fines.gracePeriod} 
                  maxFine={localPolicies.fines.maxFine} 
                />
              </PolicySectionAccordion>
              
              <PolicySectionAccordion title="Borrowing Periods">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="book-period">Physical Books (days)</Label>
                    <Input 
                      id="book-period" 
                      type="number" 
                      value={localPolicies.periods.book} 
                      onChange={(e) => handleInputChange('periods', 'book', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Standard borrowing period for physical books
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="ebook-period">E-Books (days)</Label>
                    <Input 
                      id="ebook-period" 
                      type="number" 
                      value={localPolicies.periods.ebook} 
                      onChange={(e) => handleInputChange('periods', 'ebook', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Standard borrowing period for e-books
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="audiobook-period">Audiobooks (days)</Label>
                    <Input 
                      id="audiobook-period" 
                      type="number" 
                      value={localPolicies.periods.audiobook} 
                      onChange={(e) => handleInputChange('periods', 'audiobook', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Standard borrowing period for audiobooks
                    </p>
                  </div>
                </div>
              </PolicySectionAccordion>
            </Accordion>

            <ComplianceChecker policies={localPolicies} />
          </EnhancedCardContent>
        </EnhancedCard>

        {/* Fine Calculator Preview */}
        <EnhancedCard variant="elevated">
          <EnhancedCardHeader>
            <EnhancedCardTitle className="bg-gradient-to-r from-vg-cultural-600 to-vg-primary-600 bg-clip-text text-transparent">
              Fine Calculator Preview
            </EnhancedCardTitle>
          </EnhancedCardHeader>
          <EnhancedCardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="days-overdue">Days Overdue (for preview)</Label>
                <Input
                  id="days-overdue"
                  type="number"
                  value={daysOverdue}
                  onChange={(e) => setDaysOverdue(parseInt(e.target.value) || 0)}
                  className="max-w-xs"
                />
              </div>
              <RateCalculator
                dailyRate={localPolicies.fines.dailyRate}
                days={daysOverdue}
                gracePeriod={localPolicies.fines.gracePeriod}
                maxFine={localPolicies.fines.maxFine}
              />
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </LoadingSkeleton>
    </div>
  );
}
