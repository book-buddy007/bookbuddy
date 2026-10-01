import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookOpen, Check, MoreHorizontal, Pencil, Search, Tag, Trash, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CatalogOversight() {
  const pendingBooks = [
    {
      id: 1,
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      isbn: "9780743273565",
      format: "Physical",
      submittedBy: "Sarah Johnson",
      submittedDate: "2023-06-15",
      status: "Pending",
    },
    {
      id: 2,
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      isbn: "9780061120084",
      format: "E-Book",
      submittedBy: "Michael Chen",
      submittedDate: "2023-06-14",
      status: "Pending",
    },
    {
      id: 3,
      title: "1984",
      author: "George Orwell",
      isbn: "9780451524935",
      format: "Audiobook",
      submittedBy: "Emily Davis",
      submittedDate: "2023-06-13",
      status: "Pending",
    },
  ]

  const genres = [
    { id: 1, name: "Fiction", count: 1245 },
    { id: 2, name: "Non-Fiction", count: 876 },
    { id: 3, name: "Science Fiction", count: 543 },
    { id: 4, name: "Mystery", count: 432 },
    { id: 5, name: "Biography", count: 321 },
    { id: 6, name: "History", count: 298 },
    { id: 7, name: "Fantasy", count: 276 },
    { id: 8, name: "Romance", count: 254 },
  ]

  const subjects = [
    { id: 1, name: "Mathematics", count: 432 },
    { id: 2, name: "Science", count: 387 },
    { id: 3, name: "Literature", count: 354 },
    { id: 4, name: "Computer Science", count: 321 },
    { id: 5, name: "History", count: 298 },
    { id: 6, name: "Art", count: 276 },
    { id: 7, name: "Philosophy", count: 254 },
    { id: 8, name: "Economics", count: 198 },
  ]

  return (
    <Tabs defaultValue= "PENDING" className="space-y-4">
      <TabsList>
        <TabsTrigger value= "PENDING">Pending Approvals</TabsTrigger>
        <TabsTrigger value="genres">Genres</TabsTrigger>
        <TabsTrigger value="subjects">Subjects</TabsTrigger>
      </TabsList>

      <TabsContent value= "PENDING" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{pendingBooks.length} books pending approval</div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search pending books..." className="pl-8" />
          </div>
        </div>

        <div className="border rounded-md">
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
            <div className="col-span-4">Book</div>
            <div className="col-span-2">Format</div>
            <div className="col-span-2">Submitted By</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Actions</div>
          </div>

          {pendingBooks.map((book) => (
            <div key={book.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center text-sm">
              <div className="col-span-4 flex items-center gap-3">
                <div className="h-10 w-8 bg-muted rounded flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{book.title}</div>
                  <div className="text-xs text-muted-foreground">{book.author}</div>
                </div>
              </div>
              <div className="col-span-2">{book.format}</div>
              <div className="col-span-2">{book.submittedBy}</div>
              <div className="col-span-2">{book.submittedDate}</div>
              <div className="col-span-2 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="sr-only">Approve</span>
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <X className="h-4 w-4 text-red-500" />
                  <span className="sr-only">Reject</span>
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="genres" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{genres.length} genres available</div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search genres..." className="pl-8" />
            </div>
            <Button size="sm">Add Genre</Button>
          </div>
        </div>

        <div className="border rounded-md">
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
            <div className="col-span-5">Genre</div>
            <div className="col-span-5">Book Count</div>
            <div className="col-span-2">Actions</div>
          </div>

          {genres.map((genre) => (
            <div key={genre.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center text-sm">
              <div className="col-span-5 flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="font-medium">{genre.name}</div>
              </div>
              <div className="col-span-5">{genre.count} books</div>
              <div className="col-span-2 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="subjects" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{subjects.length} subjects available</div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search subjects..." className="pl-8" />
            </div>
            <Button size="sm">Add Subject</Button>
          </div>
        </div>

        <div className="border rounded-md">
          <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm">
            <div className="col-span-5">Subject</div>
            <div className="col-span-5">Book Count</div>
            <div className="col-span-2">Actions</div>
          </div>

          {subjects.map((subject) => (
            <div key={subject.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 items-center text-sm">
              <div className="col-span-5 flex items-center gap-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="font-medium">{subject.name}</div>
              </div>
              <div className="col-span-5">{subject.count} books</div>
              <div className="col-span-2 flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
