"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface ExamJob {
  queue_id: string
  category: string
  status: "not_started" | "in_progress" | "done"
  date: string
}

export default function JobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<ExamJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchJobs = async () => {
    try {
      const response = await fetch("https://usncnfhlvb.execute-api.eu-central-1.amazonaws.com/live/jobs")

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`)
      }

      const data = await response.json()
      setJobs(data.jobs || [])
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      console.error("Error fetching jobs:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch jobs")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchJobs()

    // Set up polling every 20 seconds
    const intervalId = setInterval(() => {
      fetchJobs()
    }, 20000)

    // Cleanup interval on unmount
    return () => clearInterval(intervalId)
  }, [])

  const getStatusBadge = (status: ExamJob["status"]) => {
    switch (status) {
      case "not_started":
        return (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Not Started
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="default" className="gap-1.5 bg-blue-500 hover:bg-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            In Progress
          </Badge>
        )
      case "done":
        return (
          <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Unknown
          </Badge>
        )
    }
  }

  const getCategoryDisplay = (category: string) => {
    const categoryMap: Record<string, string> = {
      read: "Lesen",
      write_generation: "Schreiben (Generation)",
      write_evaluation: "Schreiben (Evaluation)",
      listen: "Hören"
    }
    return categoryMap[category] || category
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Exam Jobs</h1>
                <p className="text-sm text-muted-foreground">
                  Auto-refreshes every 20 seconds • Last update: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobs}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {isLoading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No exam jobs found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Queue ID</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.queue_id}>
                      <TableCell className="font-mono text-sm">{job.queue_id}</TableCell>
                      <TableCell>{getCategoryDisplay(job.category)}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>{job.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
