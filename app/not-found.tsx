import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FileQuestion } from "@/components/ui/icons"
import Link from "next/link"

// The buttons are Links styled with `buttonVariants` rather than
// `<Button asChild><Link/></Button>`. The Radix Slot composition failed to
// static-prerender inside the /_not-found boundary on Next 15.2.8+; styling the
// Link directly keeps the identical look without the Slot.
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-4xl font-bold tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/" className={cn(buttonVariants())}>
          Return to Home
        </Link>
        <Link href="/catalog" className={cn(buttonVariants({ variant: "outline" }))}>
          Browse Library
        </Link>
      </div>
    </div>
  )
}
