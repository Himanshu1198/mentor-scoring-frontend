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
        <div className="animate-fade-in-scale bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="animate-fade-in-scale bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
        </div>
      )}

      <Card className="border card-hover relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="p-6 space-y-6 relative">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg animate-slide-up">
                <span className="text-2xl font-bold text-white">{mentorInfo.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
            </div>
            <div className="flex-1 min-w-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <p className="text-2xl font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {mentorInfo.name}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mentor Profile
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">Email Address</p>
                <p className="text-sm font-semibold truncate">{mentorInfo.email}</p>
              </div>
            </div>

            {mentorInfo.createdAt && (
              <div
                className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 transition-all duration-300 hover:shadow-md hover:scale-[1.02] animate-slide-up"
                style={{ animationDelay: "300ms" }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Member Since</p>
                  <p className="text-sm font-semibold">
                    {new Date(mentorInfo.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t animate-slide-up" style={{ animationDelay: "400ms" }}>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="default"
                  className="gap-2 flex-1 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group"
                >
                  <Edit2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-fade-in-scale sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Edit Profile</DialogTitle>
                  <DialogDescription>Update your name and email address</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: "100ms" }}>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      placeholder="Enter your full name"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md"
                      required
                    />
                  </div>
                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: "200ms" }}>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      placeholder="Enter your email"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md"
                      required
                    />
                  </div>
                  <DialogFooter className="gap-2 animate-slide-up" style={{ animationDelay: "300ms" }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditOpen(false)}
                      disabled={isLoading}
                      className="transition-all hover:scale-105"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="gap-2 transition-all hover:scale-105">
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
                  size="default"
                  className="gap-2 flex-1 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:bg-muted group bg-transparent"
                >
                  <Lock className="w-4 h-4 transition-transform group-hover:scale-110" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-fade-in-scale sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and new password</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: "100ms" }}>
                    <Label htmlFor="currentPassword" className="text-sm font-medium">
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordFormData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md"
                      required
                    />
                  </div>
                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: "200ms" }}>
                    <Label htmlFor="newPassword" className="text-sm font-medium">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordFormData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password (min. 6 characters)"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md"
                      required
                    />
                  </div>
                  <div className="space-y-2 animate-slide-up" style={{ animationDelay: "300ms" }}>
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordFormData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-md"
                      required
                    />
                  </div>
                  <DialogFooter className="gap-2 animate-slide-up" style={{ animationDelay: "400ms" }}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPasswordOpen(false)}
                      disabled={isLoading}
                      className="transition-all hover:scale-105"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="gap-2 transition-all hover:scale-105">
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
