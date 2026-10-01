import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Clock, Coins } from "lucide-react"

export function BorrowingPolicies() {
  return (
    <Tabs defaultValue="limits" className="space-y-4">
      <TabsList>
        <TabsTrigger value="limits">Borrowing Limits</TabsTrigger>
        <TabsTrigger value="fines">Fine Rules</TabsTrigger>
        <TabsTrigger value="periods">Loan Periods</TabsTrigger>
      </TabsList>

      <TabsContent value="limits" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="student-books">Maximum Books</Label>
                <Input id="student-books" type="number" defaultValue="5" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-ebooks">Maximum E-Books</Label>
                <Input id="student-ebooks" type="number" defaultValue="3" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="student-audiobooks">Maximum Audiobooks</Label>
                <Input id="student-audiobooks" type="number" defaultValue="2" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Teacher Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="teacher-books">Maximum Books</Label>
                <Input id="teacher-books" type="number" defaultValue="10" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacher-ebooks">Maximum E-Books</Label>
                <Input id="teacher-ebooks" type="number" defaultValue="5" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacher-audiobooks">Maximum Audiobooks</Label>
                <Input id="teacher-audiobooks" type="number" defaultValue="3" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="fines" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fine Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="daily-rate">Daily Fine Rate</Label>
                <div className="flex items-center">
                  <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="daily-rate" type="number" defaultValue="0.50" step="0.10" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grace-period">Grace Period (Days)</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="grace-period" type="number" defaultValue="2" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max-fine">Maximum Fine Per Item</Label>
                <div className="flex items-center">
                  <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="max-fine" type="number" defaultValue="25.00" step="1.00" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fine-threshold">Fine Threshold for Blocking</Label>
                <div className="flex items-center">
                  <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="fine-threshold" type="number" defaultValue="10.00" step="1.00" />
                </div>
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="periods" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Standard Loan Periods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="books-period">Books (Days)</Label>
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="books-period" type="number" defaultValue="14" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ebooks-period">E-Books (Days)</Label>
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="ebooks-period" type="number" defaultValue="7" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="audiobooks-period">Audiobooks (Days)</Label>
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input id="audiobooks-period" type="number" defaultValue="7" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Renewal Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="max-renewals">Maximum Renewals</Label>
                <Input id="max-renewals" type="number" defaultValue="2" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="renewal-period">Renewal Period (Days)</Label>
                <Input id="renewal-period" type="number" defaultValue="7" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="renewal-block">Block Renewal If Reserved</Label>
                <select
                  id="renewal-block"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
