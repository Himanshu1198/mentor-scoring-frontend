"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { Mail, Edit2, Lock, Calendar, CheckCircle2, XCircle, Linkedin, Twitter, Phone, Plus, X } from "lucide-react"

interface MentorInfo {
  id: string
  name: string
  email: string
  createdAt?: string
}

interface MentorProfileData {
  id?: string
  userId?: string
  name: string
  email: string
  bio: string
  expertise: string[]
  teachingHighlights: string[]
  contact: {
    email: string
    phone: string
    linkedin: string
    twitter: string
  }
  subject: string
  language: string
  experienceLevel: string
  totalSessions?: number
  totalStudents?: number
  averageScore?: number
}

interface MentorProfileProps {
  mentorInfo: MentorInfo
  onUpdate: (updatedInfo: MentorInfo) => void
}

export function MentorProfile({ mentorInfo, onUpdate }: MentorProfileProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<MentorProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

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

  // Profile edit form state
  const [profileEditData, setProfileEditData] = useState<MentorProfileData | null>(null)

  // Fetch mentor profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true)
        const response = await apiClient.get(`/api/mentor-profile/${mentorInfo.id}`)
        setProfileData(response)
        setProfileEditData(response)
      } catch (err) {
        console.error("Failed to fetch mentor profile:", err)
        // Initialize with empty profile if fetch fails
        const defaultProfile: MentorProfileData = {
          name: mentorInfo.name,
          email: mentorInfo.email,
          bio: "",
          expertise: [],
          teachingHighlights: [],
          contact: {
            email: mentorInfo.email,
            phone: "",
            linkedin: "",
            twitter: "",
          },
          subject: "General",
          language: "English",
          experienceLevel: "Beginner",
        }
        setProfileData(defaultProfile)
        setProfileEditData(defaultProfile)
      } finally {
        setProfileLoading(false)
      }
    }

    fetchProfile()
  }, [mentorInfo.id])

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

  const handleProfileEditChange = (field: string, value: any) => {
    if (!profileEditData) return
    setProfileEditData({
      ...profileEditData,
      [field]: value,
    })
  }

  const handleContactChange = (field: string, value: string) => {
    if (!profileEditData) return
    setProfileEditData({
      ...profileEditData,
      contact: {
        ...profileEditData.contact,
        [field]: value,
      },
    })
  }

  const handleExpertiseAdd = (expertise: string) => {
    if (!profileEditData || !expertise.trim()) return
    if (!profileEditData.expertise.includes(expertise.trim())) {
      setProfileEditData({
        ...profileEditData,
        expertise: [...profileEditData.expertise, expertise.trim()],
      })
    }
  }

  const handleExpertiseRemove = (expertise: string) => {
    if (!profileEditData) return
    setProfileEditData({
      ...profileEditData,
      expertise: profileEditData.expertise.filter((e) => e !== expertise),
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      await apiClient.put(`/api/mentor/${mentorInfo.id}`, {
        name: editFormData.name,
        email: editFormData.email,
      })

      onUpdate({
        ...mentorInfo,
        ...editFormData,
      })

      setSuccess("Profile updated successfully!")
      setIsEditOpen(false)
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
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      if (!profileEditData) return

      const response = await apiClient.put(`/api/mentor-profile/${mentorInfo.id}`, profileEditData)

      setProfileData(response)
      setSuccess("Mentor profile updated successfully!")
      setIsProfileEditOpen(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to update mentor profile")
    } finally {
      setIsLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <div className="space-y-3">
        <Card className="p-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-center h-32">
            <div className="relative">
              <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {success && (
        <div className="animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-500 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-emerald-50 dark:from-emerald-950/30 dark:via-emerald-950/20 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3 shadow-lg backdrop-blur-sm">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in-0 duration-300 delay-200" />
          </div>
          <p className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-500 bg-gradient-to-r from-red-50 via-red-50/80 to-red-50 dark:from-red-950/30 dark:via-red-950/20 dark:to-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 shadow-lg backdrop-blur-sm">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
            <XCircle className="w-5 h-5 text-white animate-in zoom-in-0 duration-300 delay-200" />
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Basic Info Card */}
      <Card className="border group hover:border-primary/30 transition-all duration-500 relative overflow-hidden hover:shadow-2xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700" />

        <div className="p-6 space-y-6 relative">
          <div className="flex items-center gap-4">
            <div className="relative group/avatar">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 blur-md opacity-50 group-hover/avatar:opacity-100 transition-opacity duration-500 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-purple-500 to-primary/60 flex items-center justify-center shadow-2xl animate-in zoom-in-0 duration-700 delay-100 group-hover/avatar:scale-110 transition-transform duration-500">
                <span className="text-3xl font-bold text-white drop-shadow-lg">
                  {mentorInfo.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping [animation-duration:3s]" />
              <div className="absolute -inset-1 rounded-full border border-primary/20 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 space-y-1 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
              <p className="text-3xl font-bold truncate bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-[length:200%_100%] group-hover:animate-[shimmer_2s_ease-in-out_infinite]">
                {mentorInfo.name}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="font-medium">Mentor Profile</span>
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="group/card animate-in fade-in slide-in-from-left-4 duration-700 delay-300 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 border border-border/50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 hover:-translate-x-1 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover/card:scale-110 group-hover/card:rotate-6 group-hover/card:shadow-lg">
                <Mail className="w-5 h-5 text-primary transition-transform duration-500 group-hover/card:scale-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground/80 mb-1.5 uppercase tracking-wider">
                  Email Address
                </p>
                <p className="text-sm font-bold truncate group-hover/card:text-primary transition-colors duration-300">
                  {mentorInfo.email}
                </p>
              </div>
            </div>

            {mentorInfo.createdAt && (
              <div className="group/card animate-in fade-in slide-in-from-left-4 duration-700 delay-400 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/90 via-muted/70 to-muted/50 border border-border/50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 hover:-translate-x-1 cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover/card:scale-110 group-hover/card:rotate-6 group-hover/card:shadow-lg">
                  <Calendar className="w-5 h-5 text-primary transition-transform duration-500 group-hover/card:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground/80 mb-1.5 uppercase tracking-wider">
                    Member Since
                  </p>
                  <p className="text-sm font-bold group-hover/card:text-primary transition-colors duration-300">
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

          <div className="flex gap-3 pt-4 border-t animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="default"
                  className="gap-2 flex-1 transition-all duration-300 hover:scale-[1.05] hover:shadow-xl group/btn relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  <Edit2 className="w-4 h-4 transition-all duration-300 group-hover/btn:rotate-12 group-hover/btn:scale-110" />
                  <span className="relative">Edit Basic Info</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Edit Basic Info
                  </DialogTitle>
                  <DialogDescription>Update your name and email address</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-5">
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditChange}
                      placeholder="Enter your full name"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      placeholder="Enter your email"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg"
                      required
                    />
                  </div>
                  <DialogFooter className="gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditOpen(false)}
                      disabled={isLoading}
                      className="transition-all duration-300 hover:scale-105"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="gap-2 transition-all duration-300 hover:scale-105 relative overflow-hidden group/submit"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/submit:translate-x-full transition-transform duration-700" />
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                          <span className="relative">Saving...</span>
                        </>
                      ) : (
                        <span className="relative">Save Changes</span>
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
                  className="gap-2 flex-1 transition-all duration-300 hover:scale-[1.05] hover:shadow-xl group/btn relative overflow-hidden hover:bg-muted/80 bg-transparent"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  <Lock className="w-4 h-4 transition-all duration-300 group-hover/btn:scale-110 group-hover/btn:-rotate-12" />
                  <span className="relative">Change Password</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Change Password
                  </DialogTitle>
                  <DialogDescription>Enter your current password and new password</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
                    <Label htmlFor="currentPassword" className="text-sm font-semibold">
                      Current Password
                    </Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordFormData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
                    <Label htmlFor="newPassword" className="text-sm font-semibold">
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordFormData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password (min. 6 characters)"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-500 delay-300">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                      Confirm Password
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordFormData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className="transition-all duration-300 focus:scale-[1.01] focus:shadow-lg"
                      required
                    />
                  </div>
                  <DialogFooter className="gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPasswordOpen(false)}
                      disabled={isLoading}
                      className="transition-all duration-300 hover:scale-105"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="gap-2 transition-all duration-300 hover:scale-105 relative overflow-hidden group/submit"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/submit:translate-x-full transition-transform duration-700" />
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                          <span className="relative">Resetting...</span>
                        </>
                      ) : (
                        <span className="relative">Reset Password</span>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Mentor Profile Card */}
      {profileData && (
        <Card className="border group hover:border-primary/30 transition-all duration-500 relative overflow-hidden hover:shadow-2xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700" />

          <div className="p-6 space-y-6 relative">
            <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground via-amber-600 to-foreground bg-clip-text text-transparent bg-[length:200%_100%] group-hover:animate-[shimmer_2s_ease-in-out_infinite]">
                Mentor Profile
              </h3>
              <Dialog open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-all duration-300 hover:scale-110 hover:shadow-lg group/edit relative overflow-hidden bg-transparent"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover/edit:translate-x-full transition-transform duration-700" />
                    <Edit2 className="w-4 h-4 transition-transform duration-300 group-hover/edit:rotate-12" />
                    <span className="relative">Edit Profile</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                      Edit Mentor Profile
                    </DialogTitle>
                    <DialogDescription>Update your professional information</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Bio */}
                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm font-medium">
                        Professional Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={profileEditData?.bio || ""}
                        onChange={(e) => handleProfileEditChange("bio", e.target.value)}
                        placeholder="Tell students about yourself, your experience, and teaching style..."
                        className="resize-none h-24"
                      />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium">
                        Subject/Domain
                      </Label>
                      <Input
                        id="subject"
                        value={profileEditData?.subject || ""}
                        onChange={(e) => handleProfileEditChange("subject", e.target.value)}
                        placeholder="e.g., Computer Science, Mathematics, Physics"
                      />
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-sm font-medium">
                        Teaching Language
                      </Label>
                      <Input
                        id="language"
                        value={profileEditData?.language || ""}
                        onChange={(e) => handleProfileEditChange("language", e.target.value)}
                        placeholder="e.g., English, Hindi, Spanish"
                      />
                    </div>

                    {/* Experience Level */}
                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel" className="text-sm font-medium">
                        Experience Level
                      </Label>
                      <Select
                        value={profileEditData?.experienceLevel || "Beginner"}
                        onValueChange={(value) => handleProfileEditChange("experienceLevel", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner (0-2 years)</SelectItem>
                          <SelectItem value="Intermediate">Intermediate (2-5 years)</SelectItem>
                          <SelectItem value="Advanced">Advanced (5-10 years)</SelectItem>
                          <SelectItem value="Expert">Expert (10+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Expertise */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Areas of Expertise</Label>
                      <div className="flex gap-2">
                        <Input
                          id="expertiseInput"
                          placeholder="Add expertise area (e.g., Algorithms)"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleExpertiseAdd((e.target as HTMLInputElement).value)
                              ;(e.target as HTMLInputElement).value = ""
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const input = document.getElementById("expertiseInput") as HTMLInputElement
                            handleExpertiseAdd(input?.value || "")
                            if (input) input.value = ""
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profileEditData?.expertise.map((exp) => (
                          <div
                            key={exp}
                            className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                          >
                            {exp}
                            <button
                              type="button"
                              onClick={() => handleExpertiseRemove(exp)}
                              className="hover:text-primary/70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium block">Contact Information</Label>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground">
                          <Phone className="w-3 h-3 inline mr-1" />
                          Phone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profileEditData?.contact?.phone || ""}
                          onChange={(e) => handleContactChange("phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin" className="text-xs font-medium text-muted-foreground">
                          <Linkedin className="w-3 h-3 inline mr-1" />
                          LinkedIn URL
                        </Label>
                        <Input
                          id="linkedin"
                          type="url"
                          value={profileEditData?.contact?.linkedin || ""}
                          onChange={(e) => handleContactChange("linkedin", e.target.value)}
                          placeholder="https://www.linkedin.com/in/yourprofile"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twitter" className="text-xs font-medium text-muted-foreground">
                          <Twitter className="w-3 h-3 inline mr-1" />
                          Twitter/X URL
                        </Label>
                        <Input
                          id="twitter"
                          type="url"
                          value={profileEditData?.contact?.twitter || ""}
                          onChange={(e) => handleContactChange("twitter", e.target.value)}
                          placeholder="https://twitter.com/yourprofile"
                        />
                      </div>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsProfileEditOpen(false)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Profile Info Display */}
            <div className="space-y-6">
              {profileData.bio && (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-700 delay-100">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">About</h4>
                  <p className="text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-xl border border-border/50 transition-all duration-300 hover:bg-muted/50 hover:shadow-md">
                    {profileData.bio}
                  </p>
                </div>
              )}

              {profileData.expertise && profileData.expertise.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-700 delay-200">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Areas of Expertise
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profileData.expertise.map((skill, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gradient-to-br from-primary/10 to-primary/5 text-primary border border-primary/20 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-110 hover:shadow-lg hover:from-primary/20 hover:to-primary/10 cursor-default animate-in fade-in zoom-in-50 duration-500"
                        style={{ animationDelay: `${100 + index * 50}ms` }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profileData.teachingHighlights && profileData.teachingHighlights.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-700 delay-300">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Teaching Highlights
                  </h4>
                  <ul className="space-y-2">
                    {profileData.teachingHighlights.map((highlight, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-sm text-foreground/90 p-3 rounded-xl bg-muted/30 border border-border/50 transition-all duration-300 hover:bg-muted/50 hover:scale-[1.02] hover:shadow-md group/item animate-in fade-in slide-in-from-left-2 duration-500"
                        style={{ animationDelay: `${100 + index * 100}ms` }}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover/item:scale-110 group-hover/item:rotate-12">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <span className="flex-1">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-400">
                <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 transition-all duration-500 hover:shadow-xl hover:scale-105 hover:from-blue-500/20 hover:to-blue-500/10 cursor-default">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                    Subject
                  </p>
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {profileData.subject || "General"}
                  </p>
                </div>
                <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 transition-all duration-500 hover:shadow-xl hover:scale-105 hover:from-purple-500/20 hover:to-purple-500/10 cursor-default">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                    Language
                  </p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                    {profileData.language || "English"}
                  </p>
                </div>
                <div className="group/stat p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 transition-all duration-500 hover:shadow-xl hover:scale-105 hover:from-emerald-500/20 hover:to-emerald-500/10 cursor-default">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    Experience
                  </p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    {profileData.experienceLevel || "Beginner"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t animate-in fade-in slide-in-from-bottom-2 duration-700 delay-500">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="grid gap-3">
                  {profileData.contact.email && (
                    <div className="group/contact flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 via-muted/60 to-muted/40 border border-border/50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover/contact:scale-110 group-hover/contact:rotate-6">
                        <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-500 group-hover/contact:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                          Email
                        </p>
                        <p className="text-sm font-bold truncate group-hover/contact:text-primary transition-colors duration-300">
                          {profileData.contact.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {profileData.contact.phone && (
                    <div className="group/contact flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 via-muted/60 to-muted/40 border border-border/50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover/contact:scale-110 group-hover/contact:rotate-6">
                        <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-transform duration-500 group-hover/contact:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                          Phone
                        </p>
                        <p className="text-sm font-bold group-hover/contact:text-primary transition-colors duration-300">
                          {profileData.contact.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {profileData.contact.linkedin && (
                    <div className="group/contact flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 via-muted/60 to-muted/40 border border-border/50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/10 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover/contact:scale-110 group-hover/contact:rotate-6">
                        <Linkedin className="w-5 h-5 text-sky-600 dark:text-sky-400 transition-transform duration-500 group-hover/contact:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                          LinkedIn
                        </p>
                        <p className="text-sm font-bold truncate group-hover/contact:text-primary transition-colors duration-300">
                          {profileData.contact.linkedin}
                        </p>
                      </div>
                    </div>
                  )}

                  {profileData.contact.twitter && (
                    <div className="group/contact flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-muted/80 via-muted/60 to-muted/40 border border-border/50 transition-all duration-500 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 cursor-pointer">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover/contact:scale-110 group-hover/contact:rotate-6">
                        <Twitter className="w-5 h-5 text-purple-600 dark:text-purple-400 transition-transform duration-500 group-hover/contact:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider mb-1">
                          Twitter
                        </p>
                        <p className="text-sm font-bold truncate group-hover/contact:text-primary transition-colors duration-300">
                          {profileData.contact.twitter}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
