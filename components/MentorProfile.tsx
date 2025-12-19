"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"
import { Mail, Edit2, Lock, Calendar, CheckCircle2, XCircle } from "lucide-react"

interface MentorInfo {
  id: string
  name: string
  email: string
  createdAt?: string
}

interface MentorProfileProps {
  mentorInfo: MentorInfo
  onUpdate: (updatedInfo: MentorInfo) => void
}

export function MentorProfile({ mentorInfo, onUpdate }: MentorProfileProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: mentorInfo.name,
    email: mentorInfo.email,
  })

  // Password form state
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      // API call to update mentor profile
      const response = await apiClient.put(`/api/mentor/${mentorInfo.id}`, {
        name: editFormData.name,
        email: editFormData.email,
      })

      onUpdate({
        ...mentorInfo,
        ...editFormData,
      })

      setSuccess("Profile updated successfully!")
      setIsEditOpen(false)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (passwordFormData.newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      // API call to reset password
      await apiClient.post(`/api/mentor/${mentorInfo.id}/reset-password`, {
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
      })

      setSuccess("Password reset successfully!")
      setIsPasswordOpen(false)
      setPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {success && (
        <div className="animate-fade-in-scale bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="animate-fade-in-scale bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300 text-xs font-medium">{error}</p>
        </div>
      )}

      <Card className="border card-hover">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary">{mentorInfo.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold truncate">{mentorInfo.name}</p>
              <p className="text-xs text-muted-foreground">Mentor Profile</p>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <Mail className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{mentorInfo.email}</p>
              </div>
            </div>

            {mentorInfo.createdAt && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="text-sm font-medium">
                    {new Date(mentorInfo.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-1.5 flex-1 transition-smooth hover:scale-[1.02]">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-fade-in-scale">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                  <DialogDescription>Update your name and email address</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      placeholder="Enter your full name"
                      className="transition-smooth focus:scale-[1.01]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      placeholder="Enter your email"
                      className="transition-smooth focus:scale-[1.01]"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isLoading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1 transition-smooth hover:scale-[1.02] bg-transparent"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-fade-in-scale">
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>Enter your current password and new password</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordFormData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      className="transition-smooth focus:scale-[1.01]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordFormData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password (min. 6 characters)"
                      className="transition-smooth focus:scale-[1.01]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordFormData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className="transition-smooth focus:scale-[1.01]"
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPasswordOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>
    </div>
  )
}
