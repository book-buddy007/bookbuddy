import { Button } from "@/components/ui/button"
import { Library, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function DashboardHero() {
  return (
    <div className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2">
            <Library className="h-10 w-10" />
            <h1 className="text-3xl font-bold tracking-tight">Book Buddy</h1>
          </div>
          <p className="text-xl max-w-2xl mx-auto">
            Book Buddy by VPD — the digital library and reading platform for educational institutions
          </p>

          <div className="w-full max-w-md mt-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-primary-foreground/60" />
            </div>
            <Input
              type="search"
              placeholder="Search for books, authors, or topics..."
              className="pl-10 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/30"
            />
          </div>

          <div className="flex flex-wrap gap-4 justify-center mt-4">
            <Button variant="secondary">Browse Library</Button>
            <Button
              variant="outline"
              className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              My Books
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
