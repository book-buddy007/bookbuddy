"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { motion } from "framer-motion"

export default function BranchesPage() {
  const [activeTab, setActiveTab] = useState("all")

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Branch Management</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Branches</TabsTrigger>
          <TabsTrigger value= "ACTIVE">Active</TabsTrigger>
          <TabsTrigger value= "INACTIVE">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>All Branches</CardTitle>
                <CardDescription>View and manage all branches in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Branch list will go here */}
                <p className="text-muted-foreground">No branches found</p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value= "ACTIVE" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Active Branches</CardTitle>
                <CardDescription>View and manage active branches</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Active branch list will go here */}
                <p className="text-muted-foreground">No active branches found</p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value= "INACTIVE" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Inactive Branches</CardTitle>
                <CardDescription>View and manage inactive branches</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Inactive branch list will go here */}
                <p className="text-muted-foreground">No inactive branches found</p>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 