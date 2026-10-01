import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Download, Upload } from "lucide-react"

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: "borrow",
      user: { name: "Alex Johnson", initials: "AJ" },
      book: "The Great Gatsby",
      time: "2 hours ago",
      icon: Download,
    },
    {
      id: 2,
      type: "return",
      user: { name: "Sarah Miller", initials: "SM" },
      book: "To Kill a Mockingbird",
      time: "5 hours ago",
      icon: Upload,
    },
    {
      id: 3,
      type: "borrow",
      user: { name: "Michael Chen", initials: "MC" },
      book: "1984",
      time: "Yesterday",
      icon: Download,
    },
  ]

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={activity.user.name} />
            <AvatarFallback>{activity.user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{activity.user.name}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <activity.icon className="mr-1 h-3 w-3" />
              <span>
                {activity.type === "borrow" ? "Borrowed" : "Returned"}{" "}
                <span className="font-medium">{activity.book}</span>
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{activity.time}</div>
        </div>
      ))}
    </div>
  )
}
